use std::any::Any;
use std::sync::Arc;
use tauri::Manager;
use zeroconf::prelude::*;
use zeroconf::{MdnsBrowser, ServiceDiscovery, ServiceType};
use std::time::Duration;

#[derive(Clone, serde::Serialize)]
struct DiscoveredService {
    name: String,
    service_type: String,
    domain: String,
    port: u16,
    // we can extract IPs if needed
}

fn create_browser(
    service_name: &str,
    protocol: &str,
    app_handle: tauri::AppHandle,
) -> Result<MdnsBrowser, Box<dyn std::error::Error>> {
    let mut browser = MdnsBrowser::new(ServiceType::new(service_name, protocol)?);

    let service_name_copy = service_name.to_string();
    browser.set_service_callback(Box::new(
        move |result: zeroconf::Result<zeroconf::BrowserEvent>, _context: Option<Arc<dyn Any + Send + Sync>>| {
            if let Ok(event) = result {
                if let zeroconf::BrowserEvent::Add(service) = event {
                    let payload = DiscoveredService {
                        name: service.name().to_string(),
                        service_type: service_name_copy.clone(),
                        domain: service.domain().to_string(),
                        port: *service.port(),
                    };
                    
                    // Emit event to frontend
                    let _ = app_handle.emit_all("zeroconf-service-discovered", payload);
                }
            }
        },
    ));

    Ok(browser)
}

pub fn start_browser(app_handle: tauri::AppHandle) {
    let services_to_browse = vec![
        ("snapcast-http", "tcp"),
        ("snapcast-https", "tcp"),
        ("snapcast-ctrl", "tcp"),
        ("snapcast", "tcp"),
    ];

    tauri::async_runtime::spawn(async move {
        // Create browsers
        let mut browsers = Vec::new();
        for (name, proto) in &services_to_browse {
            if let Ok(browser) = create_browser(name, proto, app_handle.clone()) {
                browsers.push(browser);
            }
        }
        
        // Polling loop (if using standard MdnsBrowser blocking loop in an async spawn, wait, if zeroconf 0.17 provides async, this might change).
        // For standard zeroconf without direct async integration, you'd usually use an event loop.
        let mut event_loops = Vec::new();
        for browser in browsers.iter_mut() {
            if let Ok(ev) = browser.browse_services() {
                event_loops.push(ev);
            }
        }

        loop {
            for ev in event_loops.iter() {
                let _ = ev.poll(Duration::from_millis(100)); // Non-blocking poll or small sleep
            }
            tokio::time::sleep(Duration::from_millis(500)).await;
        }
    });
}
