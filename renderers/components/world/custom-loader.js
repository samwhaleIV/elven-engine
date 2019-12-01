import GlobalState from "../../../runtime/global-state.js";

function CustomWorldLoader() {
    let ranCustomLoader = false;
    Object.defineProperty(this,"ranCustomLoader",{
        get: function() {
            return ranCustomLoader
        }
    });
    this.loadLastMapOrDefault = () => {
        let lastMap, lp, debugPosition;
        if(ENV_FLAGS.DEBUG_MAP) {
            if(typeof ENV_FLAGS.DEBUG_MAP === "string") {
                lastMap = ENV_FLAGS.DEBUG_MAP;
                if(GlobalState.data["last_map"] !== lastMap) {
                    debugPosition = true;
                }
            } else {
                lastMap = ENV_FLAGS.DEBUG_MAP.name;
                if(ENV_FLAGS.DEBUG_MAP.position) {
                    lp = ENV_FLAGS.DEBUG_MAP.position;
                    if(isNaN(lp.x)) lp.x = 0;
                    if(isNaN(lp.y)) lp.y = 0;
                    if(!lp.d) lp.d = "down";
                    debugPosition = true;
                }
            }
        } else {
            lastMap = GlobalState.data["last_map"]; 
        }
        if(lastMap) {
            this.updateMap(lastMap);
            if(!debugPosition) {
                lp = GlobalState.data["last_player_pos"];
            }
            if(lp) {
                return () => {
                    if(this.internalPlayerObject && !this.internalPlayerObject.forcedStartPosition) {
                        this.moveObject(this.internalPlayerObject.ID,lp.x,lp.y,true);
                        this.internalPlayerObject.updateDirection(lp.d);
                    }
                }
            }
        } else {
            let startMap = this.chapter.startMap ? this.chapter.startMap : null;
            if(!startMap) {
                startMap = FALLBACK_MAP_ID;
                console.warn(`World: Using a fallback map because chapter ${this.activeChapter} is missing a start map start map`);
            }
            this.updateMap(startMap);
        }
        return null;
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
        if(this.chapterState.mapChanged) {
            this.chapterState.mapChanged(this.map);
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
            if(!fromMapUpdate && this.chapterState.load) {
                this.chapterState.load(this);
            }
            this.updateMapEnd();
            if(!fromMapUpdate) {
                if(loadPlayer) {
                    loadPlayer();
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
