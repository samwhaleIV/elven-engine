const OVERWORLD_MUSIC_FADE_TIME = 100;

function WorldSongController() {
    this.stopMusic = callback => {
        fadeOutSongs(OVERWORLD_MUSIC_FADE_TIME,callback);
    }
    this.playSong = songName => {
        const playingSongFull = musicNodes[songName];
        let intro = SONG_INTRO_LOOKUP[songName];
        let playingIntro = false;
        if(intro) {
            intro = songName + MUSIC_INTRO_SUFFIX;
            playingIntro = musicNodes[intro] ? true : false;
        }
        if(!playingIntro && !playingSongFull) {
            let didRunCustomLoader = this.ranCustomLoader;
            this.stopMusic(()=>{
                const extraTime = !didRunCustomLoader ? faderTime / 2 : FAKE_OVERWORLD_LOAD_TIME;
                let songIntro = null;
                const fadeIn = () => {
                    let fadeInTarget;
                    if(songIntro !== null) {
                        fadeInTarget = songIntro;
                    } else {
                        fadeInTarget = songName;
                    }
                    const activeNode = musicNodes[fadeInTarget];
                    if(activeNode) {
                        const gainProperty = activeNode.volumeControl.gain;
                        gainProperty.setValueAtTime(0.001,audioContext.currentTime);
                        gainProperty.linearRampToValueAtTime(
                            1.0,
                            audioContext.currentTime+
                            OVERWORLD_MUSIC_FADE_TIME/1000
                        );
                    }
                }
                const enter_sandman = songName => {
                    let intro = SONG_INTRO_LOOKUP[songName];
                    if(intro && audioBuffers[intro]) {
                        intro = songName + MUSIC_INTRO_SUFFIX;
                        songIntro = intro;
                        playMusicWithIntro(songName,intro);
                    } else {
                        const fancyEncodingData = FANCY_INTRO_SONGS[songName];
                        if(fancyEncodingData) {
                            const introName = songName + MUSIC_INTRO_SUFFIX;
                            generateIntroFromBuffer(
                                songName,introName,
                                fancyEncodingData.introLength,
                                fancyEncodingData.switchZoneLength
                            );
                            playMusicWithIntro(songName,introName);
                        } else {
                            playMusic(songName);
                        }
                    }
                    fadeIn();
                }
                if(extraTime) {
                    setTimeout(enter_sandman,extraTime,songName);
                } else {
                    enter_sandman(songName);
                }
            });
        }
    }
    this.restoreRoomSong = () => {
        const roomSong = this.renderMap.roomSong ?
            this.renderMap.roomSong : this.renderMap.songParent ?
                worldMaps[this.renderMap.songParent].roomSong : null;
        if(!roomSong) {
            this.stopMusic();
            return;
        }
        this.playSong(roomSong);
    }
}
export default WorldSongController;
