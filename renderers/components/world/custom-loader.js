function CustomWorldLoader() {
    let ranCustomLoader = false;
    Object.defineProperty(this,"ranCustomLoader",{
        get: function() {
            return ranCustomLoader
        }
    });
    this.loadLastMapOrDefault = () => {
        throw Error("World: loadLastMapOrDefault or default does not have an implementation!");
    }
    this.updateMapEnd = function() {
        this.pendingPlayerObject = null;
        if(this.map.load) {
            this.map.load(this);
        }
        if(this.map.getCameraStart) {
            this.camera = this.map.getCameraStart(this);
        }
        if(this.pendingPlayerObject) {
            this.playerObject = this.pendingPlayerObject;
        }
        this.pendingPlayerObject = null;
        if(this.mapChanged) {
            this.mapChanged();
        }
        this.restoreRoomSong();
    }
    this.customLoader = (callback,fromMapUpdate=false,sourceRoom) => {
        const callbackWithMapPost = (firstTime=false) => {
            this.updateCamera(performance.now(),this.playerInteractionLocked());
            if(this.map.start) {
                if(firstTime) {
                    this.faderCompleted = () => {
                        this.map.start(this);
                    };
                } else {
                    this.map.start(this);
                }
            } else {
                this.unlockPlayerMovement();
            }
            callback();
        }
        this.lockPlayerMovement();
        const startTime = performance.now();
        let loadPlayer = null;
        const finishedLoading = () => {
            const endTime = performance.now();
            const realTimeSpentLoading = endTime - startTime;
            const firstTime = !ranCustomLoader;
            if(!fromMapUpdate && this.firstTimeLoad) {
                this.firstTimeLoad();
            }
            this.updateMapEnd();
            if(!fromMapUpdate) {
                if(loadPlayer) {
                    loadPlayer(this.internalPlayerObject);
                }
                ranCustomLoader = true;
            }
            if(firstTime || sourceRoom === this.renderMap.songParent || worldMaps[sourceRoom].songParent === this.renderMap.name) {
                callbackWithMapPost(firstTime);
            } else {
                const fakeDelay = FAKE_OVERWORLD_LOAD_TIME - realTimeSpentLoading;
                if(fakeDelay > 0) {
                    setTimeout(callbackWithMapPost,fakeDelay);
                } else {
                    callbackWithMapPost(firstTime);
                }
            }
        }
        if(!fromMapUpdate) {
            loadPlayer = this.loadLastMapOrDefault();
        }
        let requiredSongs = this.renderMap.requiredSongs ?
            this.renderMap.requiredSongs : this.renderMap.songParent ?
                worldMaps[this.renderMap.songParent].requiredSongs : null;

        if(requiredSongs) {
            requiredSongs = requiredSongs.slice();
        }

        const roomSong = this.renderMap.roomSong ?
            this.renderMap.roomSong : this.renderMap.songParent ?
                worldMaps[this.renderMap.songParent].roomSong : null;

        if(!requiredSongs && roomSong) {
            requiredSongs = [roomSong];
        } else if(requiredSongs && roomSong) {
            let containsRoomSong = false;
            for(let i = 0;i<requiredSongs.length;i++) {
                if(requiredSongs[i] === roomSong) {
                    containsRoomSong = true;
                    break;
                }
            }
            if(!containsRoomSong) {
                requiredSongs.push(roomSong);
            }
        }
        if(requiredSongs) {
            let loadedSongs = 0;
            const songNames = {};
            requiredSongs.forEach(song => {
                const introSong = SONG_INTRO_LOOKUP[song];
                if(introSong) {
                    requiredSongs.push(introSong);
                }
            });
            const totalSongs = requiredSongs.length;
            const callbackIfReady = () => {
                if(loadedSongs === totalSongs) {
                    audioBufferAddedCallback = null;
                    finishedLoading();
                }
            }
            audioBufferAddedCallback = name => {
                if(songNames[name]) {
                    loadedSongs++;
                    callbackIfReady();
                }
            };
            requiredSongs.forEach(song => {
                songNames[song] = true;
                if(audioBuffers[song] || failedBuffers[song]) {
                    loadedSongs++;
                } else {
                    loadSongOnDemand(song);
                }
            });
            callbackIfReady();
        } else {
            finishedLoading();
        }
    }
}
export default CustomWorldLoader;
