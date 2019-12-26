"use strict";
const canvas = document.getElementById("canvas");
let pictureModeElementTimeout = null;

let rendererState = null;
let animationFrame = null;
let paused = true;

let capturingPointer = false;
let capturingAltPointer = false;
let sizeApplicationDeferred = false;
let lastRelativeX = -1;
let lastRelativeY = -1;

const heightByWidth = internalHeight / internalWidth;
let widthByHeight = internalWidth / internalHeight;

const backgroundCanvas = document.getElementById("background-canvas");

const USE_GLOBAL_ALPHA = ENV_FLAGS.GLOBAL_CONTEXT_ALPHA ? true : false;
const USE_FRAME_BUFFER = ENV_FLAGS.NO_FRAME_BUFFER ? false : true;

const getContextSettings = () => {
    return {
        alpha: USE_GLOBAL_ALPHA,
        desynchronized: false
    };
};
const context = canvas.getContext("2d",getContextSettings());
const backgroundContext = backgroundCanvas.getContext("2d",{
    alpha: false,
    desynchronized: false
});
if(!ENV_FLAGS.STATIC_BACKGROUND) {
    backgroundContext.fillStyle = "black";
}

let electron = null;
let electronWindow = null;
if(typeof(require) !== "undefined") {
    electron = require("electron");
    electronWindow = electron.remote.getCurrentWindow();
}
if(ENV_FLAGS.DO_STEAM_SETUP) {
    steamSetup();
}

let fullWidth;
let fullHeight;
let halfWidth;
let halfHeight;
let doubleWidth;
let doubleHeight;
let largestDimension;
let smallestDimension;
let halfLargestDimension;
let halfSmallestDimension;
let aspectRatio;
let greaterWidth;
let greaterHeight;
let widthNormal;
let adaptiveTextScale;
let adaptiveTextSpacing;
let rainbowGradient;

const pictureModeElement = document.getElementById("picture-mode-element");

const keyEventModes = {
    downOnly: Symbol("downOnly"),
    none: Symbol("none"),
    upAndDown: Symbol("upAndDown")
}
const pointerEventModes = {
    upOnly: Symbol("upOnly"),
    none: Symbol("none"),
    upAndDown: Symbol("upAndDown")
}
const keyEventTypes = {
    keyDown: Symbol("keyDown"),
    keyUp: Symbol("keyUp"),
}
const pointerEventTypes = {
    pointerUp: Symbol("pointerUp"),
    pointerDown: Symbol("pointerDown")
}
const sizeModes = {
    fit: {
        name: "fit",
        classicName: "fill",
        displayName: "box fill"
    },
    stretch: {
        name: "stretch",
        classicName: "stretch",
        displayName: "fill"
    },
    center: {
        name: "center",
        classicName: "1:1 scale",
        displayName: "box 1:1"
    },
    classic: {
        name: "classic",
        displayName: "none"
    }
}
let pointerEventMode = pointerEventModes.none;
let altPointerEventMode = pointerEventModes.none;
let keyEventMode = keyEventModes.none;
let canvasSizeMode = localStorage.getItem(SIZE_MODE_KEY);
if(!canvasSizeMode) {
    if(ENV_FLAGS.DEFAULT_SIZE_MODE) {
        canvasSizeMode = ENV_FLAGS.DEFAULT_SIZE_MODE;
    } else {
        canvasSizeMode = "stretch";
    }
}

function getRelativeEventLocation(event) {
    return {
        x: Math.floor(
            event.layerX / canvas.clientWidth * canvas.width
        ),
        y: Math.floor(
            event.layerY / canvas.clientHeight * canvas.height
        )
    }
}
function touchEnabled(event) {
    return rendererState && !rendererState.transitioning && !paused && event.isPrimary;
}
function touchEnabledMove(event) {
    return rendererState && !paused && event.isPrimary;
}
function keyinputEnabled() {
    if(!rendererState) {
        return false;
    } else if((paused && !rendererState.allowKeysDuringPause) || rendererState.transitioning) {
        return false;
    }
    return true;
}
function setPageTitle(title) {
    document.title = title;
}
function routeKeyEvent(keyCode,type) {
    switch(keyEventMode) {
        case keyEventModes.none:
            break;
        case keyEventModes.downOnly:
            if(type === keyEventTypes.keyDown) {
                rendererState.processKey(keyCode);
            }
            break;
        case keyEventModes.upAndDown:
            switch(type) {
                case keyEventTypes.keyDown:
                    rendererState.processKey(keyCode);
                    break;
                case keyEventTypes.keyUp:
                    rendererState.processKeyUp(keyCode);
                    break;
            }
            break;
    }
}
function routePointerEvent(event,type,alt=false) {
    const relativeEventLocation = getRelativeEventLocation(event);
    lastRelativeX = relativeEventLocation.x;
    lastRelativeY = relativeEventLocation.y;
    switch(alt?altPointerEventMode:pointerEventMode) {
        case pointerEventModes.none:
            break;
        case pointerEventModes.upOnly:
            if(type === pointerEventTypes.pointerUp) {
                (alt?rendererState.processClickAlt:rendererState.processClick).call(
                    rendererState,
                    lastRelativeX,lastRelativeY
                );
            }
            break;
        case pointerEventModes.upAndDown:
            switch(type) {
                case pointerEventTypes.pointerUp:
                    (alt?rendererState.processClickEndAlt:rendererState.processClickEnd).call(
                        rendererState,
                        lastRelativeX,lastRelativeY
                    );
                    break;
                case pointerEventTypes.pointerDown:
                    (alt?rendererState.processClickAlt:rendererState.processClick).call(
                        rendererState,
                        lastRelativeX,lastRelativeY
                    );
                    break;
            }
            break;
    }
}
canvas.onpointerup = event => {
    stopEventBubbling(event);
    if(event.button === 0) {
        capturingPointer = false;
        if(touchEnabled(event)) {
            routePointerEvent(event,pointerEventTypes.pointerUp,false);
        }
    } else if(event.button === 2) {
        if(touchEnabled(event)) {
            capturingAltPointer = false;
            routePointerEvent(event,pointerEventTypes.pointerUp,true);
        }
    }
}
canvas.onpointerdown = event => {
    stopEventBubbling(event);
    if(event.button === 0) {
        capturingPointer = true;
        if(touchEnabled(event)) {
            routePointerEvent(event,pointerEventTypes.pointerDown,false);
        }
    } else if(event.button === 2) {
        if(touchEnabled(event)) {
            capturingAltPointer = true;
            routePointerEvent(event,pointerEventTypes.pointerDown,true);
        }
    }
}
function cancelPointerEvent(event) {
    stopEventBubbling(event);
    if(touchEnabled(event)) {
        if(capturingPointer) {
            capturingPointer = false;
            if(pointerEventMode === pointerEventModes.upAndDown) {
                routePointerEvent(event,pointerEventTypes.pointerUp,false);
            }
        }
        if(capturingAltPointer) {
            capturingAltPointer = false;
            if(altPointerEventMode === pointerEventModes.upAndDown) {
                routePointerEvent(event,pointerEventTypes.pointerUp,true);
            }
        }
    }
}
function stopEventBubbling(event) {
    if(event.preventDefault) {
        event.preventDefault();
    }
    if(event.stopPropagation) {
        event.stopPropagation();
    }
}
canvas.onpointermove = processMouseMove;
canvas.onpointerleave = cancelPointerEvent;
if(ENV_FLAGS.NO_CONTEXT_MENU) {
    document.body.oncontextmenu = stopEventBubbling;
}

function processMouseMove(event) {
    stopEventBubbling(event);
    if(touchEnabledMove(event)) {
        const relativeEventLocation = getRelativeEventLocation(
            event
        );
        lastRelativeX = relativeEventLocation.x;
        lastRelativeY = relativeEventLocation.y;
        if(rendererState.processMove) {
            rendererState.processMove(
                relativeEventLocation.x,
                relativeEventLocation.y
            );  
        }
    }
}
let keybindings = (function(){
    const savedBinds = localStorage.getItem(KEY_BINDS_KEY);
    if(savedBinds) {
        return JSON.parse(savedBinds);
    } else {
        localStorage.setItem(KEY_BINDS_KEY,DEFAULT_KEY_BINDS);
        return JSON.parse(DEFAULT_KEY_BINDS);
    }
})();
let nextKeybindWatchID = 0;
const keybindWatchers = {};
const addKeybindWatch = callback => {
    const ID = nextKeybindWatchID;
    nextKeybindWatchID++;
    keybindWatchers[ID] = callback;
    return ID;
}
const removeKeybindWatch = ID => {
    delete keybindWatchers[ID];
}
const notifyKeybindWatchers = () => {
    const watchers = Object.values(keybindWatchers);
    watchers.forEach(watch=>watch());
}
const setKeybinds = newBinds => {
    let hasFullscreen = false;
    let usesF11 = false;
    Object.entries(newBinds).forEach(entry => {
        if(entry[0] === "F11") {
            usesF11 = true;
        }
        if(entry[1] === kc.fullscreen) {
            hasFullscreen = true;
        }
    });
    if(!hasFullscreen && !usesF11) {
        newBinds["F11"] = kc.fullscreen;
    }
    keybindings = newBinds;
    localStorage.setItem(KEY_BINDS_KEY,JSON.stringify(keybindings));
    notifyKeybindWatchers();
}
const rewriteKeyboardEventCode = eventCode => {
    if(kc_inverse[eventCode]) {
        return eventCode;
    }
    return keybindings[eventCode];
}
const sendKeyUp = event => {
    stopEventBubbling(event);
    if(!keyinputEnabled()) {
        return;
    }
    const keyCode = rewriteKeyboardEventCode(event.code);
    if(keyCode === undefined) {
        return;
    }
    routeKeyEvent(keyCode,keyEventTypes.keyUp);
}
const sendKeyDown = event => {
    if(ENV_FLAGS.ENABLE_F_BUTTONS && (event.key === "F12" || event.key === "F5")) {
        return;
    }
    const keyCode = rewriteKeyboardEventCode(event.code);
    if(keyCode === undefined) {
        stopEventBubbling(event);
        return;
    }
    switch(keyCode) {
        case kc.fullscreen:
            if(!electron) {
                return;
            }
            const isFullScreen = !electronWindow.isFullScreen();
            electronWindow.setFullScreen(isFullScreen);
            if(pictureModeElementTimeout) {
                clearTimeout(pictureModeElementTimeout);
            }
            pictureModeElement.textContent = isFullScreen ? "fullscreen" : "not fullscreen";
            pictureModeElementTimeout = setTimeout(()=>{
                pictureModeElement.textContent = "";
                pictureModeElementTimeout = null;
            },600);
            break;
        case kc.picture_mode:
            cycleSizeMode();
            break;
    }
    stopEventBubbling(event);
    if(!keyinputEnabled()) {
        return;
    }
    routeKeyEvent(keyCode,keyEventTypes.keyDown);
};
(function keyRegistration() {
    const downKeys = {};
    window.addEventListener("keydown",function(event){
        downKeys[event.code] = {
            keyCode: event.keyCode,
            code: event.code,
            key: event.key
        };
        sendKeyDown.call(null,event);
    });
    window.addEventListener("keyup",function(event){
        delete downKeys[event.code];
        sendKeyUp.call(null,event);
    });
    window.addEventListener("blur",function(){
        Object.values(downKeys).forEach(sendKeyUp);
    });
})();
window.addEventListener("resize",applySizeMode.bind(this,false));

function createRainbowGradient() {
    const gradient = context.createLinearGradient(fullWidth*0.3,0,fullWidth*0.7,0);
    gradient.addColorStop(0,"red");
    gradient.addColorStop(1/6,"orange");
    gradient.addColorStop(2/6,"yellow");
    gradient.addColorStop(3/6,"green");
    gradient.addColorStop(4/6,"blue");
    gradient.addColorStop(5/6,"indigo");
    gradient.addColorStop(1,"violet");
    return gradient;
}

function setSizeConstants() {
    halfWidth = fullWidth / 2;
    halfHeight = fullHeight / 2;
    doubleWidth = fullWidth * 2;
    doubleHeight = fullHeight * 2;
    if(fullWidth > fullHeight) {
        largestDimension = fullWidth;
        smallestDimension = fullHeight;
    } else {
        largestDimension = fullHeight;
        smallestDimension = fullWidth;
    }
    halfLargestDimension = largestDimension / 2;
    halfSmallestDimension = smallestDimension / 2;
    aspectRatio = fullWidth / fullHeight;
    if(aspectRatio >= 1) {
        greaterWidth = true;
        greaterHeight = false;
    } else {
        greaterWidth = false;
        greaterHeight = true;
    }
    widthNormal = fullWidth / maxHorizontalResolution;
}

function applyLowResolutionTextAdaptions() {
    adaptiveTextScale = lowResolutionAdaptiveTextScale;
    adaptiveTextSpacing = lowResolutionAdpativeTextSpacing;
}
function applyHighResolutionTextAdaptions() {
    adaptiveTextScale = highResolutionAdaptiveTextScale;
    adaptiveTextSpacing = highResolutionAdaptiveTextSpacing;
}
function applyMediumResolutionTextAdaptions() {
    adaptiveTextScale = mediumResolutionAdaptiveTextScale;
    adaptiveTextSpacing = mediumResolutionAdaptiveTextSpacing;
}
function applySizeMode(forced=false) {
    if(!rendererState) {
        return;
    }
    if(!forced && paused) {
        sizeApplicationDeferred = true;
        return;
    }
    if(rendererState.forcedSizeMode === sizeModes.classic.name) {
        fullWidth = internalWidth;
        fullHeight = internalHeight;
        switch(canvasSizeMode) {
            default:
            case "fit":
                if(window.innerWidth / window.innerHeight > widthByHeight) {
                    const newWidth = window.innerHeight * widthByHeight;
                    canvas.style.height = window.innerHeight + "px";
                    canvas.style.width = newWidth + "px";
                    canvas.style.top = "0px";
                    canvas.style.left = (window.innerWidth / 2) - (newWidth / 2) + "px";
                } else {
                    const newHeight = window.innerWidth * heightByWidth;
                    canvas.style.width = window.innerWidth + "px";
                    canvas.style.height = newHeight + "px";
                    canvas.style.top = ((window.innerHeight / 2) - (newHeight / 2)) + "px";
                    canvas.style.left = "0px";
                }
                break;
            case "stretch":
                canvas.style.width = "100%";
                canvas.style.height = "100%";
                canvas.style.left = "0";
                canvas.style.top = "0";
                break;
            case "center":
                canvas.style.width = fullWidth + "px";
                canvas.style.height = fullHeight + "px";
                canvas.style.left = ((window.innerWidth / 2) - (fullWidth / 2)) + "px";
                canvas.style.top = "4vh";
                break;
        }
    } else {
        let sizeMode;
        if(rendererState.forcedSizeMode) {
            sizeMode = rendererState.forcedSizeMode;
            if(canvasSizeMode === sizeModes.center.name && rendererState.forcedSizeMode === sizeModes.fit.name) {
                sizeMode = sizeModes.center.name;
            } else if(canvasSizeMode === sizeModes.fit.name && rendererState.forcedSizeMode === sizeModes.center.name) {
                sizeMode = sizeModes.fit.name;
            }
        } else {
            sizeMode = canvasSizeMode;
        }
        if(sizeMode === sizeModes.stretch.name &&
            (
                (window.innerWidth / window.innerHeight > maximumWidthToHeightRatio ||
                window.innerHeight / window.innerWidth > maximumHeightToWidthRatio) ||
                (window.innerHeight < internalHeight || window.innerWidth < internalWidth)
            ) && !rendererState.disableAdaptiveFill
        ) {
            sizeMode = sizeModes.fit.name;
        }
        switch(sizeMode) {
            case sizeModes.fit.name:
                applyLowResolutionTextAdaptions();
                fullWidth = internalWidth;
                fullHeight = internalHeight;
                if(window.innerWidth / window.innerHeight > widthByHeight) {
                    const newWidth = window.innerHeight * widthByHeight;
    
                    canvas.style.height = window.innerHeight + "px";
                    canvas.style.width = newWidth + "px";
    
                    canvas.style.top = "0px";
                    canvas.style.left = (window.innerWidth / 2) - (newWidth / 2) + "px";
                } else {
                    const newHeight = window.innerWidth * heightByWidth;
    
                    canvas.style.width = window.innerWidth + "px";
                    canvas.style.height = newHeight + "px";
    
                    canvas.style.top = ((window.innerHeight / 2) - (newHeight / 2)) + "px";
                    canvas.style.left = "0px";
                }
                break;
            default:
            case sizeModes.stretch.name:
                let zoomDivider;
                if(!rendererState.noPixelScale) {
                    zoomDivider = rendererState ? rendererState.zoomDivider || defaultFullScreenZoom : defaultFullScreenZoom;
                    if(window.innerWidth >= maxHorizontalResolution) {
                        zoomDivider = window.innerWidth / maxHorizontalResolution * defaultFullScreenZoom;
                        applyHighResolutionTextAdaptions();
                    } else if(window.innerWidth < smallScaleSnapPoint) {
                        zoomDivider = smallFullScreenZoom;
                        applyLowResolutionTextAdaptions();
                    } else if(window.innerWidth < mediumScaleSnapPoint) {
                        zoomDivider = mediumFullScreenZoom;
                        applyMediumResolutionTextAdaptions();
                    } else {
                        applyHighResolutionTextAdaptions();
                    }
                } else {
                    if(window.innerWidth >= maxHorizontalResolution) {
                        //4k scaling is forced regardless of noScale
                        zoomDivider = window.innerWidth / maxHorizontalResolution;
                    } else {
                        zoomDivider = 1;
                    }
                    applyHighResolutionTextAdaptions();
                }
    
                fullWidth = (window.innerWidth/zoomDivider)
                fullHeight = (window.innerHeight/zoomDivider);
    
                canvas.style.width = window.innerWidth + "px";
                canvas.style.height = window.innerHeight + "px";
                canvas.style.left = "0px";
                canvas.style.top = "0px";
                break;
            case sizeModes.center.name:
                applyLowResolutionTextAdaptions();

                fullWidth = internalWidth;
                fullHeight = internalHeight;

                canvas.style.width = fullWidth + "px";
                canvas.style.height = fullHeight + "px";
                canvas.style.left = ((window.innerWidth / 2) - (fullWidth / 2)) + "px";
                canvas.style.top = "4vh";
                break;
        }
    }
    setSizeConstants();
    rainbowGradient = createRainbowGradient();
    if(rendererState.updateSize) {
        rendererState.updateSize();
    }
}
function cycleSizeMode() {
    let newMode = defaultSizeMode;
    let displayNameType =  rendererState.forcedSizeMode === sizeModes.classic.name ? "classicName" : "displayName";
    switch(canvasSizeMode) {
        default:
        case sizeModes.fit.name:
            newMode = sizeModes.center.name;
            break;
        case sizeModes.stretch.name:
            newMode = sizeModes.fit.name;
            break;
        case sizeModes.center.name:
            newMode = sizeModes.stretch.name;
            break;
    }
    if(pictureModeElementTimeout) {
        clearTimeout(pictureModeElementTimeout);
    }
    pictureModeElement.textContent = sizeModes[newMode][displayNameType];
    pictureModeElementTimeout = setTimeout(()=>{
        pictureModeElement.textContent = "";
        pictureModeElementTimeout = null;
    },600);
    canvasSizeMode = newMode;
    applySizeMode(false);
    localStorage.setItem(SIZE_MODE_KEY,newMode);
    console.log(`Canvas handler: Set size mode to '${newMode}'`);
}
const isValidGamepad = gamepad => {
    return gamepad && gamepad.mapping === "standard";
};
const renderGamepads = timestamp => {
    const gamepads = navigator.getGamepads();
    for(let i = 0;i < gamepads.length;i++) {
        const gamepad = gamepads[i];
        if(isValidGamepad(gamepad)) {
            processGamepad(gamepad,timestamp);
            break;
        }
    }
};
let bufferCanvas = null;
let bufferContext = null;
if(USE_FRAME_BUFFER) {
    bufferCanvas = new OffscreenCanvas(0,0);
    bufferContext = bufferCanvas.getContext(
        "2d",getContextSettings()
    );
}
const updateBufferContext = () => {
    bufferCanvas.width = canvas.width;
    bufferCanvas.height = canvas.height;
    bufferContext.drawImage(canvas,0,0);
};
const renderBufferContext = () => {
    context.drawImage(bufferCanvas,0,0);
};
const tryRenderBufferContext = () => {
    if(USE_FRAME_BUFFER) {
        renderBufferContext();
    }
};
const tryUpdateBufferContext = () => {
    if(USE_FRAME_BUFFER) {
        updateBufferContext();
    }
}
const render = (function(){
    const evaluatedRenderMethod = Function("timestamp",
        `"use strict";animationFrame = window.requestAnimationFrame(render);
        ${!ENV_FLAGS.STATIC_BACKGROUND?"backgroundContext.fillRect(0,0,1,1);":""}
        if(!paused) {
            ${USE_FRAME_BUFFER?"updateBufferContext();":""};
            canvas.width = fullWidth;
            canvas.height = fullHeight;
            context.imageSmoothingEnabled = false;
            rendererState.render(timestamp);
            rendererState.fader.render(timestamp);
            ${!ENV_FLAGS.CONTROLLER_DISABLED?"renderGamepads(timestamp);":""}
        }`);
    return evaluatedRenderMethod;
})();
function stopRenderer() {
    console.warn("Warning: Stopping the renderer is deprecated for typical use cases. Use pause and resume methods instead");
    if(!rendererState) {
        console.warn("Warning: The renderer is already stopped and cannot be stopped further.");
        return;
    }
    window.cancelAnimationFrame(animationFrame);
    rendererState = null;
    console.log("Renderer stopped");
}
let didStartRenderer = false;
function tryRendererStateStart(timestamp) {
    if(rendererState.start && !rendererState.didStart) {
        rendererState.start(timestamp);
        rendererState.didStart = true;
    }
}
function startRenderer() {
    if(!ENV_FLAGS.ALLOW_REPEAT_RENDER_START && didStartRenderer) {
        throw Error("Canvas handler: Repeat renderer starts are disallowed by your environment flags!");
    }
    if(!rendererState) {
        console.error("Error: Missing renderer state; the renderer cannot start.");
        return;
    }
    paused = false;
    didStartRenderer = true;
    if(animationFrame) {
        window.cancelAnimationFrame(animationFrame);
    }
    animationFrame = window.requestAnimationFrame(render);
    tryRendererStateStart(performance.now());
    console.log("Canvas handler: Renderer started for the first time.");
}
function setRendererState(newRendererState) {
    rendererState = newRendererState;
    if(!rendererState.fader) {
        rendererState.fader = getFader();
    }
    applySizeMode(true);
    if(rendererState.processKey) {
        if(rendererState.processKeyUp) {
            keyEventMode = keyEventModes.upAndDown;
        } else {
            keyEventMode = keyEventModes.downOnly;
        }
    } else {
        console.warn("Canvas handler: This renderer state is possibly misconfigured for key events");
        keyEventMode = keyEventModes.none;
    }
    if(rendererState.processClick) {
        if(rendererState.processClickEnd) {
            pointerEventMode = pointerEventModes.upAndDown;
        } else {
            pointerEventMode = pointerEventModes.upOnly;
        }
    } else {
        console.warn("Canvas handler: This renderer state is possibly misconfigured for pointer events");
        pointerEventMode = pointerEventModes.none;
    }
    if(rendererState.processClickAlt) {
        if(rendererState.processClickEndAlt) {
            altPointerEventMode = pointerEventModes.upAndDown;
        } else {
            altPointerEventMode = pointerEventModes.upOnly;
        }
    } else {
        altPointerEventMode = pointerEventModes.none;
    }
}
function pauseRenderer(doNotRenderBufferContext=false) {
    if(USE_FRAME_BUFFER && !doNotRenderBufferContext) {
        renderBufferContext();
    }
    paused = true;
    console.log("Canvas handler: Paused renderer");
}
function resumeRenderer() {
    paused = false;
    console.log("Canvas handler: Resumed renderer");
}
function forceRender() {
    if(!rendererState) {
        console.error("Error: Missing renderer state; the renderer cannot render.");
        return;
    }
    console.log("Canvas handler: Forced render");
    window.cancelAnimationFrame(animationFrame);
    render(performance.now());
}
function saveOffscreenCanvas(canvas) {
    canvas.convertToBlob({
        type: "image/png"
    }).then(function(blob) {
        window.open(URL.createObjectURL(blob));
    });
}
function saveBufferCanvas() {
    return saveOffscreenCanvas(bufferCanvas);
}
