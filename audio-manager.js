"use strict";
const audioContext = new (window.AudioContext||window.webkitAudioContext);

let musicVolume = musicNodeGain;
let soundVolume = soundGain;

const volumeScaleFactor = 1;

const volumeNode = audioContext.createGain();
volumeNode.gain.setValueAtTime(soundVolume,audioContext.currentTime);
volumeNode.connect(audioContext.destination);

const musicVolumeNode = audioContext.createGain();
musicVolumeNode.gain.setValueAtTime(musicVolume,audioContext.currentTime);
musicVolumeNode.connect(audioContext.destination);

function saveVolumeChanges() {
    localStorage.setItem(VOLUME_STORAGE_KEY,JSON.stringify({
        sound: getSoundVolume(),
        music: getMusicVolume(),
        scaleFactor: volumeScaleFactor
    }));
}
function restoreVolumeChanges() {
    const storageResult = localStorage.getItem(VOLUME_STORAGE_KEY);
    if(storageResult) {
        const volumeData = JSON.parse(storageResult);
        const scaleFactor = volumeData.scaleFactor ? volumeData.scaleFactor : volumeScaleFactor;
        setSoundVolume(volumeData.sound,scaleFactor);
        setMusicVolume(volumeData.music,scaleFactor);
    } else {
        saveVolumeChanges();
    }
}

function getMusicVolume() {
    return musicVolume / volumeScaleFactor;
}
function getSoundVolume() {
    return soundVolume / volumeScaleFactor;
}
function setMusicVolume(normal,scaleFactor=volumeScaleFactor) {
    normal *= scaleFactor;
    if(normal > volumeScaleFactor) {
        normal = volumeScaleFactor;
    }
    if(normal > 0) {
        musicVolume = normal;
        if(musicMuted) {
            unmuteMusic();
        } else {
            musicVolumeNode.gain.value = normal;
        }
    } else {
        musicVolume = 0;
        if(!musicMuted) {
            muteMusic();
        }
    }
}
function setSoundVolume(normal,scaleFactor=volumeScaleFactor) {
    normal *= scaleFactor;
    if(normal > volumeScaleFactor) {
        normal = volumeScaleFactor;
    }
    if(normal > 0) {
        soundVolume = normal;
        if(soundMuted) {
            unmuteSound();
        } else {
            volumeNode.gain.value = normal;
        }
    } else {
        soundVolume = 0;
        if(!soundMuted) {
            muteSound();
        }
    }
}

const musicOutputNode = musicVolumeNode;
const soundOutputNode = volumeNode;

const audioBuffers = {};
const failedBuffers = {};

let audioBufferAddedCallback = null;
let musicNodes = {}, musicMuted = false, soundMuted = false;

let startSyncTime = null;
let loopSyncTime = null;
let introMuteManifest = {};
let loopMuteManifest = {};
let startSpeedManifest = {};
let startDetuneManifest = {};

function sendAudioBufferAddedCallback(name) {
    if(audioBufferAddedCallback) {
        audioBufferAddedCallback(name);
    }
}

function toggleMusicMute() {
    if(musicMuted) {
        unmuteMusic();
    } else {
        muteMusic();
    }
}

function toggleSoundMute() {
    if(soundMuted) {
        unmuteSound();
    } else {
        muteSound();
    }
}

function muteMusic() {
    if(!musicMuted) {
        musicVolumeNode.gain.setValueAtTime(0,audioContext.currentTime);
        musicMuted = true;
        localStorage.setItem("musicMuted",true);
    } else {
        console.warn("Audio manager: Music already muted");
    }
}
function muteSound() {
    if(!soundMuted) {
        volumeNode.gain.setValueAtTime(0,audioContext.currentTime);
        soundMuted = true;
        localStorage.setItem("soundMuted",true);
    } else {
        console.warn("Audio manager: Sound already muted");
    }
}

function unmuteSound() {
    if(soundMuted) {
        volumeNode.gain.setValueAtTime(soundVolume,audioContext.currentTime);
        soundMuted = false;
        localStorage.setItem("soundMuted",false);
    } else {
        console.warn("Audio manager: Sound already unmuted");
    }
}

function unmuteMusic() {
    if(musicMuted) {
        musicVolumeNode.gain.setValueAtTime(musicVolume,audioContext.currentTime);
        musicMuted = false;
        localStorage.setItem("musicMuted",false);
    } else {
        console.warn("Audio manager: Music already unmuted");
    }
}
function muteTrack(name) {
    if(musicNodes[name]) {
        musicNodes[name].volumeControl.gain.setValueAtTime(0,audioContext.currentTime);
    }
}
function unmuteTrack(name) {
    if(musicNodes[name]) {
        musicNodes[name].volumeControl.gain.setValueAtTime(1,audioContext.currentTime);
    }
}

function fadeOutSongs(musicFadeOutDuration,callback) {
    clearMusicEnvironment();
    const endTime = audioContext.currentTime + (musicFadeOutDuration / 1000);
    for(let key in musicNodes) {
        musicNodes[key].volumeControl.gain.linearRampToValueAtTime(0,endTime);
    }
    setTimeout(()=>{
        for(let key in musicNodes) {
            deleteTrack(key);
        }
        if(callback) {
            callback();
        }
    },musicFadeOutDuration);
}

let lastIntroID = 0;
function getNextIntroID() {
    return lastIntroID++;
}

let lastSoundID = 0;
function getNextSoundID() {
    return lastSoundID++;
}
let activeSounds = {};
let activeLoops = {};

function playMusicWithIntro(loopName,introName,withLoop=true) {
    const introBuffer = audioBuffers[introName];
    const loopBuffer = audioBuffers[loopName];
    if(!introBuffer || !loopBuffer) {
        if(!introBuffer) {
            console.warn(`Audio manager: '${introName}' is missing from audio buffers. Did we fail to load it?`);
        } else {
            console.warn(`Audio manager: '${loopName}' is missing from audio buffers. Did we fail to load it?`);
        }
    } else {
        const musicNode = audioContext.createBufferSource();
        if(startSpeedManifest[introName]) {
            musicNode.playbackRate.setValueAtTime(startSpeedManifest[introName],audioContext.currentTime);
        }
        if(startDetuneManifest[introName]) {
            musicNode.detune.setValueAtTime(startDetuneManifest[introName],audioContext.currentTime);
        }
        musicNode.buffer = introBuffer;
        musicNode.loop = false;
        const loopID = getNextIntroID();
        activeLoops[loopID] = true;
        musicNode.loopID = loopID;

        musicNode.volumeControl = audioContext.createGain();
        if(introMuteManifest[introName] && !introMuteManifest[introName].shouldPlay) {
            musicNode.volumeControl.gain.setValueAtTime(0,audioContext.currentTime);
        }
        musicNode.volumeControl.connect(musicOutputNode);
        musicNode.connect(musicNode.volumeControl);

        if(startSyncTime === null) {
            startSyncTime = audioContext.currentTime + 0.01;
        }

        const startedTime = performance.now();

        musicNode.onended = () => {
            if(!musicNodes[introName] || !activeLoops[loopID]) {
                return;
            }
            const loopMusicNode = audioContext.createBufferSource();
            if(startSpeedManifest[loopName]) {
                loopMusicNode.playbackRate.setValueAtTime(startSpeedManifest[loopName],audioContext.currentTime);
            }
            if(startDetuneManifest[loopName]) {
                loopMusicNode.detune.setValueAtTime(startDetuneManifest[loopName],audioContext.currentTime);
            }
            loopMusicNode.buffer = loopBuffer;
            loopMusicNode.loop = withLoop;

            if(loopSyncTime === null) {
                loopSyncTime = audioContext.currentTime;
            }
    
            loopMusicNode.volumeControl = audioContext.createGain();
            if(loopMuteManifest[loopName] && !loopMuteManifest[loopName].shouldPlay) {
                loopMusicNode.volumeControl.gain.setValueAtTime(0,audioContext.currentTime);
            }
            loopMusicNode.volumeControl.connect(musicOutputNode);
            loopMusicNode.connect(loopMusicNode.volumeControl);

            const loopStartTime = audioContext.currentTime + audioContext.currentTime - loopSyncTime;
            loopMusicNode.start(loopStartTime);
            musicNodes[loopName] = loopMusicNode;
            deleteTrack(introName);
        }

        //This works so long as we can process everything within introBuffer.duration - which should never happen
        if(audioContext.currentTime > startSyncTime) {
            musicNode.start(audioContext.currentTime,audioContext.currentTime-startSyncTime);
        } else {
            musicNode.start(startSyncTime,0,musicNode.buffer.length);
        }
        musicNodes[introName] = musicNode;

    }
}

function playMusic(name,withLoop=true) {
    const buffer = audioBuffers[name];
    if(!buffer) {
        if(failedBuffers[name]) {
            console.warn(`Audio manager: '${name}' is missing from audio buffers. It failed to load at a previous time`);
        } else {
            console.warn(`Audio manager: '${name}' is missing from audio buffers. Did we fail to load it?`);
        }
        if(!withLoop) {
            return 0;
        }
    } else {
        const musicNode = audioContext.createBufferSource();
        musicNode.buffer = buffer;
        musicNode.loop = withLoop;

        musicNode.volumeControl = audioContext.createGain();
        musicNode.volumeControl.connect(musicOutputNode);
        musicNode.connect(musicNode.volumeControl);

        musicNode.start();
        musicNodes[name] = musicNode;
        if(!withLoop) {
            return buffer.duration;
        }
    }
}

function deleteTrack(name) {
    console.log(`Audio manager: Deleted track '${name}'`);
    const node = musicNodes[name];
    node.stop();
    node.volumeControl.disconnect(musicOutputNode);
    delete musicNodes[name];
}

function clearMusicEnvironment() {
    startSyncTime = null;
    loopSyncTime = null;
    activeLoops = {};
    startSpeedManifest = {};
    introMuteManifest = {};
    loopMuteManifest = {};
    startDetuneManifest = {};
}

function stopMusic() {
    clearMusicEnvironment();
    for(let key in musicNodes) {
        deleteTrack(key);
    }
}

function playSound(name,duration) {
    const buffer = audioBuffers[name];
    if(buffer) {
        const bufferSourceNode = audioContext.createBufferSource();
        bufferSourceNode.buffer = buffer;
        if(duration) {
            bufferSourceNode.playbackRate.setValueAtTime(buffer.duration / duration,audioContext.currentTime);
        }
        const soundID = getNextSoundID();
        bufferSourceNode.soundID = soundID;
        bufferSourceNode.onended = () => {
            const soundBucket = activeSounds[name];
            if(soundBucket) {
                const activeSound = soundBucket[soundID];
                if(activeSound) {
                    delete soundBucket[soundID];
                    if(!Object.keys(soundBucket).length) {
                        delete activeSounds[name];
                    }
                }
            }
        }
        let soundBucket = activeSounds[name];
        if(!soundBucket) {
            soundBucket = {};
            activeSounds[name] = soundBucket;
        }
        soundBucket[soundID] = bufferSourceNode;
        bufferSourceNode.connect(soundOutputNode);
        bufferSourceNode.start();

    } else {
        console.warn(`Audio manager: '${name}' is missing from audio buffers. Did we fail to load it?`);
    }
}
function stopSoundBucket(bucket) {
    Object.values(bucket).forEach(soundInstance => soundInstance.stop());
}
function stopSound(name) {
    const soundBucket = activeSounds[name];
    if(soundBucket) {
        stopSoundBucket(soundBucket);
    }
}
function stopAllSounds() {
    Object.entries(activeSounds).forEach(stopSoundBucket);
}
function addBufferSource (fileName,callback,errorCallback) {
    let newName = fileName.split("/").pop();
    const newNameSplit = newName.split(".");
    newName = newNameSplit[newNameSplit.length-2];
    if(failedBuffers[newName]) {
        sendAudioBufferAddedCallback(newName);
        if(errorCallback) {
            errorCallback(fileName);
        }
        return;
    }
    const decode = audioData => {
        audioContext.decodeAudioData(
            audioData,
            audioBuffer => {
                audioBuffers[newName] = audioBuffer;
                sendAudioBufferAddedCallback(newName);
                console.log(`Audio manager: Added '${newName}' to audio buffers`);
                if(callback) {
                    callback(fileName);
                }
            },
            () => {
                failedBuffers[newName] = true;
                sendAudioBufferAddedCallback(newName);
                console.error(`Audio manager: Failure to decode '${fileName}' as an audio file`);
                if(errorCallback) {
                    errorCallback(fileName);
                }
            }
        );
    }
    const reader = new FileReader();
    reader.onload = event => {
        decode(event.target.result);
    }

    const request = new XMLHttpRequest();

    let path = location.href.split("/");
    path.pop();

    path = path.join("/");

    request.open("GET",`${path}/${fileName}`);
    request.responseType = "blob";
    request.onload = function() {
        if(this.status === 200 || this.status === 0) {
            reader.readAsArrayBuffer(this.response);
        } else {
            console.log(`Audio manager: Failure to fetch '${fileName}' (Status code: ${this.status})`);
            failedBuffers[newName] = true;
            sendAudioBufferAddedCallback(newName);
            if(errorCallback) {
                errorCallback(fileName);
            }
        }
    }
    request.send();
}
if(localStorage.getItem("soundMuted") === "true") {
    muteSound();
}
if(localStorage.getItem("musicMuted") === "true") {
    muteMusic();
}
