#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

mod zeroconf_browser;

use tauri::Manager;

fn main() {
  let context = tauri::generate_context!();
  tauri::Builder::default()
    .setup(|app| {
        zeroconf_browser::start_browser(app.handle());
        Ok(())
    })
    .menu(tauri::Menu::os_default(&context.package_info().name))
    .run(context)
    .expect("error while running tauri application");
}
