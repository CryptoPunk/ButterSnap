#!/bin/bash
SOURCE_DIR=$(dirname $(readlink -f "$BASH_SOURCE[0]"))
TMPDIR=$(mktemp -d /tmp/snapserver-XXXXXX)
mkfifo $TMPDIR/song.raw
FFMPEG_LOG=$TMPDIR/ffmpeg.log
SNAPSERVER_LOG=$TMPDIR/snapserver.log

ffmpeg -y -re -stream_loop -1 -i $SOURCE_DIR/song.mp3 -f s16le -acodec pcm_s16le -ar 48000 $TMPDIR/song.raw > $FFMPEG_LOG 2>&1 &
FFMPEG_PID=$!
sleep 1
snapserver -c $SOURCE_DIR/snaptest.conf --stream.source="pipe://$TMPDIR/song.raw?name=test&mode=read&controlscript=snap_instrument.py" --stream.plugin_dir=$SOURCE_DIR/plugins/  --stream.sandbox_dir=$TMPDIR > $SNAPSERVER_LOG 2>&1 &
SNAPSERVER_PID=$!
ls -l $TMPDIR
atexit () {
    rm -rf $TMPDIR
    kill $FFMPEG_PID
    kill $SNAPSERVER_PID
}
trap atexit EXIT


wait $SNAPSERVER_PID