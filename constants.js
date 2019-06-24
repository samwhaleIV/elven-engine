"use strict";
const PI2 = Math.PI * 2;
const ellipsis = "…";

const maxHorizontalResolution = 1920;
const mediumScaleSnapPoint = 1600;
const smallScaleSnapPoint = 810;

const defaultFullScreenZoom = 1;
const mediumFullScreenZoom = 0.9;
const smallFullScreenZoom = 0.75;

const maximumWidthToHeightRatio = 2.5;
const maximumHeightToWidthRatio = 1.25;

const highResolutionAdaptiveTextScale = 3;
const highResolutionAdaptiveTextSpacing = 4;

const mediumResolutionAdaptiveTextScale = 3;
const mediumResolutionAdaptiveTextSpacing = 4;

const lowResolutionAdaptiveTextScale = 2;
const lowResolutionAdpativeTextSpacing = 1;

const kc = {
    accept: "k_accept",
    cancel: "k_cancel",
    picture_mode: "k_picture_mode",
    open: "k_open",
    up: "k_up",
    down: "k_down",
    left: "k_left",
    right: "k_right",
    nav_right: "k_nav_right",
    nav_left: "k_nav_left",
    fullscreen: "k_fullscreen"
}
const kc_inverse = {};
Object.entries(kc).forEach(entry=>{
    kc_inverse[entry[1]] = entry[0];
})
let leftBumperCode = {code:kc.nav_left};
let rightBumperCode = {code:kc.nav_right};
let aButtonCode = {code:kc.accept};
let yButtonCode = {code:kc.picture_mode};
let bButtonCode = {code:kc.cancel};
let upButtonCode = {code:kc.up};
let downButtonCode = {code:kc.down};
let leftButtonCode = {code:kc.left};
let rightButtonCode = {code:kc.right};
let startButtonCode = {code:kc.accept};

const DEFAULT_KEY_BINDS = JSON.stringify({
    Enter: kc.accept,
    Escape: kc.cancel,
    KeyP: kc.picture_mode,
    Space: kc.open,
    KeyW: kc.up,
    KeyD: kc.right,
    KeyS: kc.down,
    KeyA: kc.left,
    KeyN: kc.nav_left,
    KeyM: kc.nav_right,
    F11: kc.fullscreen
});
const KEY_BINDS_KEY = "UV_KEY_BINDS";
const VOLUME_STORAGE_KEY = "UV_VOLUME";

const textControlCodes = {
    "\n": /\n/g,
    "ȸ": /ȸ/g,
    "ȹ": /ȹ/g,
    "ȴ": /ȴ/g,
    "ȵ": /ȵ/g,
    "ɇ": /ɇ/g,
    "Ƚ": /Ƚ/g,
    "ȿ": /ȿ/g,
    "ɍ": /ɍ/g,
    "φ": /φ/g
}
const textColorLookup = {
    "ȸ": "red",
    "ȹ": "green",
    "ȴ": "blue",
    "ȵ": "goldenrod",
    "ɇ": "blueviolet",
    "Ƚ": "darkorange",
    "ȿ": "deeppink",
    "φ": "cyan",
    "ɍ": 0
}
const inverseTextColorLookup = (function(){
    const inverse = {};
    Object.entries(textColorLookup).forEach(entry => {
        inverse[entry[1]] = entry[0];
    });
    return inverse;
})();
const popupControlCharacters = {
    "-": true,
    " ": true,
    ",": true,
    ".": true,
    "?": true,
    "!": true,
    " ": true
}
popupControlCharacters[ellipsis] = true;

const SpriteAlertTimeout = 400;

const MUSIC_FILE_FORMAT = ENV_FLAGS.MUSIC_FILE_FORMAT || "ogg";
