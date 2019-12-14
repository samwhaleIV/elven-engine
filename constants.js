"use strict";
const PI2 = Math.PI * 2;
const ellipsis = "…";

let defaultSizeMode = "stretch";

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

const FAKE_OVERWORLD_LOAD_TIME = 500;

const kc = {
    accept: "k_accept",
    cancel: "k_cancel",
    picture_mode: "k_picture_mode",
    open: "k_open",
    up: "k_up",
    down: "k_down",
    left: "k_left",
    right: "k_right",
    special_1: "k_special_1",
    special_2: "k_special_2",
    nav_right: "k_nav_right",
    nav_left: "k_nav_left",
    fullscreen: "k_fullscreen"
}
const kc_inverse = {};
Object.entries(kc).forEach(entry=>{
    kc_inverse[entry[1]] = entry[0];
});
let leftBumperCode = {code:kc.nav_left};
let rightBumperCode = {code:kc.nav_right};
let aButtonCode = {code:kc.accept};
let xButtonCode = {code:kc.special_2};
let yButtonCode = {code:kc.special_1};
let bButtonCode = {code:kc.cancel};
let upButtonCode = {code:kc.up};
let downButtonCode = {code:kc.down};
let leftButtonCode = {code:kc.left};
let rightButtonCode = {code:kc.right};
let startButtonCode = {code:kc.accept};

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
    "ā": /ā/g,
    "ō": /ō/g,
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
    "ā": "black",
    "ō": "white",
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
const IMAGE_TO_BITMAP_SETTINGS = {
    imageOrientation: "none",
    //Premultiply has no observed performance changes
    premultiplyAlpha: "premultiply",
    colorSpaceConversion: "default",
    resizeQuality: "pixelated"                   
};

const MUSIC_FILE_FORMAT = ENV_FLAGS.MUSIC_FILE_FORMAT || "ogg";
const ERROR_IMAGE = "error";
const TRIGGER_ACTIVATED = Symbol("TRIGGER_ACTIVATED");

function lerp(v0,v1,t) {
    return v0*(1-t)+v1*t
}
const invertDirection = direction => {
    switch(direction) {
        case "up":
            return "down";
        case "down":
            return "up";
        case "left":
            return "right";
        case "right":
            return "left";
        default:
            return direction;
    }
}
function delay(time,...parameters) {
    return new Promise(resolve=>setTimeout(resolve,time,...parameters));
}
function getRandomPolarity() {
    return Math.round(Math.random()) * 2 - 1;
}
