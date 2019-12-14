import PlayerController from "../runtime/player-controller.js";
import { PlayerRenderer, SpriteRenderer, ElfRenderer } from "./components/world/sprite.js";
import TileSprite from "./components/world/tile-sprite.js";
import WorldPopup from "./components/world/popup.js";
import WorldPrompt from "./components/world/prompt.js";
import GlobalState from "../runtime/global-state.js";
import GetOverworldCharacter from "../runtime/character-creator.js";
import UIAlert from "./components/ui-alert.js";
import {FadeIn,FadeOut} from "./components/fade.js";
import ObjectiveHUD from "./components/world/objective-hud.js";
import ApplyTimeoutManager from "../../../elven-engine/runtime/inline-timeout.js";
import MultiLayer from "./components/multi-layer.js";
import LightSprite from "./components/world/light-sprite.js";
import GetLightTableReferences from "./components/world/light-table.js";
import PsuedoSpriteWrapper from "./components/world/psuedo-sprite-wrapper.js";
import WorldSongController from "./components/world/song-controller.js";
import MoveSprite from "./components/world/sprite-mover.js";
import CustomWorldLoader from "./components/world/custom-loader.js";
import LetterUI from "./components/world/letter-ui.js";
import ImagePreview from "./components/world/image-preview.js";

const ALERT_TIME = 1000;
const ANIMATION_FRAME_TIME = ANIMATION_CYCLE_DURATION / ANIMATION_TILE_COUNT;
const POPUP_TIMEOUT = 250;
const WALK_AFTER_POPUP_DELAY = 150;
const DEFAULT_BACKGROUND_COLOR = "black";

const CAMERA_RESOLVE_RATE = 5000;

const NEGATIVE_INFINITY_BUT_NOT_REALLY = -1000000;
const IS_ZERO_FILTER = value => value === 0;

const getDefaultCamera = () => {
    return {
        x: 10,
        y: 10,
        xOffset: 0,
        yOffset: 0
    };
};

function WorldRenderer() {
    this.ImagePreview = ImagePreview;
    this.allowKeysDuringPause = true;
    this.disableAdaptiveFill = true;
    this.escapeMenu = null;
    this.noPixelScale = true;
    let tileset = null;
    let alert = null;
    let objectiveHUD = null;
    let internalPlayerObject = null;
    this.pendingPlayerObject = null;
    this.map = null;
    this.objects = {};
    this.objectsLookup = [];
    let offscreenObjects = [];
    let offscreenObjectCount = 0;
    let lastID = 0;
    let cameraXFollowEnabled = true;
    let cameraYFollowEnabled = true;
    let backgroundRenderer = null;
    let lightTable;
    let refreshLightTable;
    this.popup = null;
    this.prompt = null;
    let lightingLayerActive = false;
    let playerMovementLocked = false;
    let lastCameraResolve = null;

    let escapeMenuShown = false;
    this.escapeMenuDisabled = false;
    let wDown = false;
    let sDown = false;
    let aDown = false;
    let dDown = false;
    let enterReleased = true;
    this.popupProgressEnabled = true;
    let horizontalTiles,     verticalTiles,
    horizontalOffset,    verticalOffset,
    tileSize,
    halfHorizontalTiles, halfVerticalTiles;

    this.cameraFrozen = false;
    this.fixedCameraOverride = false;
    this.followObject = null;
    this.postProcessor = new PostProcessor(0.25);
    this.compositeProcessor = null;

    this.cameraResolveX = 0;
    this.cameraResolveY = 0;

    let backgroundColor = DEFAULT_BACKGROUND_COLOR;

    CustomWorldLoader.apply(this);
    WorldSongController.apply(this);
    ApplyTimeoutManager(this);
    this.moveSprite = MoveSprite.bind(this);

    this.camera = getDefaultCamera();
    const customRendererStackIDLIFO = [];
    const customRendererStack = new MultiLayer();

    this.playerController = new PlayerController(this);
    let lastPopupCleared = NEGATIVE_INFINITY_BUT_NOT_REALLY;
    let tileRenderingEnabled = true;
    this.decals = [];

    (function(){
        const references = GetLightTableReferences();
        lightTable = references.table;
        refreshLightTable = references.updateSize;
    })();

    this.tileSprite = PsuedoSpriteWrapper(this,TileSprite);
    this.lightSprite = PsuedoSpriteWrapper(this,LightSprite,lightTable);
    this.sprite = SpriteRenderer;
    this.elfSprite = ElfRenderer;
    this.getTileSprite = tileID => new this.tileSprite(tileID);
    this.getLightSprite = lightID => new this.lightSprite(lightID);
    this.getCharacter = (name,direction) => GetOverworldCharacter(this,name,direction,false);
    this.getStaticCharacter = name => GetOverworldCharacter(this,name,null,true);

    Object.defineProperty(this,"globalState",{
        get: function() {return GlobalState.data}
    });
    Object.defineProperty(this,"playerObject",{
        get: function() {
            if(this.pendingPlayerObject) {
                return this.pendingPlayerObject;
            } else {
                return internalPlayerObject;
            }
        },
        set: function(value) {
            internalPlayerObject = value;
            this.playerController.player = value;
        }
    });
    Object.defineProperty(this,"internalPlayerObject",{
        get: function() {
            return internalPlayerObject;
        }
    });
    this.showAlert = (message,duration=ALERT_TIME,noSound=false) => {
        alert = new UIAlert(message.toLowerCase(),duration,noSound);
    }
    this.clearAlert = () => {
        alert = null;
    }
    const safeFade = (duration,fadeIn) => {
        return new Promise(resolve => {
            const fader = fadeIn ? FadeIn : FadeOut;
            let ID;
            ID = this.addCustomRenderer(new fader(duration,null,()=>{
                resolve(ID);
            }));
        });
    }
    this.setObjectiveHUD = (...parameters) => {
        objectiveHUD = new ObjectiveHUD(this,...parameters);
        return objectiveHUD;
    }
    this.clearObjectiveHUD = () => {
        objectiveHUD = null;
    }
    this.fadeFromBlack = async duration => {
        return safeFade(duration,true);
    }
    this.fadeToBlack = async duration => {
        return safeFade(duration,false);
    }
    this.managedFaderTransition = (...parameters) => {
        this.postProcessor.terminate();
        if(this.map.unload) {
            this.map.unload(this);
        }
        if(this.unload) {
            this.unload();
        }
        this.fader.fadeOut(...parameters);
    }
    this.saveState = (withPositionData=true,skipGlobal=false) => {
        if(withPositionData && internalPlayerObject) {
            GlobalState.data["last_map"] = this.renderMap.name;
            GlobalState.data["last_player_pos"] = {
                d: internalPlayerObject.direction,
                x: Math.round(internalPlayerObject.x + internalPlayerObject.xOffset),
                y: Math.round(internalPlayerObject.y + internalPlayerObject.yOffset)
            }
        }
        if(!skipGlobal) {
            GlobalState.save();
        }
    };
    this.restoreState = (ignorePositionData=false) => {
        console.warn("This method has not gone through extensive testing. It may be wiser to reload the world renderer state.");
        GlobalState.restore();
        if(ignorePositionData) {
            return;
        }
        const loadPlayer = this.loadLastMapOrDefault();
        if(loadPlayer) {
            loadPlayer(this.internalPlayerObject);
        }
    }
    this.formatStringWithCharacter = (character,customString) => {
        const message = customString.replace("{NAME}",character.coloredName);
        return this.showInstantPopupSound(message);
    }

    this.getItemPreviewBounds = () => {
        const x = 10;
        const width = fullWidth - 20;

        let y = 10;
        let height = fullHeight - 20;
        
        if(this.popup) {
            if(objectiveHUD) {
                const objectiveHUDBottom = objectiveHUD.getBottom();
                y += objectiveHUDBottom;
                height -= objectiveHUDBottom;
            }
            height -= fullHeight - this.popup.startY + 10;
        } else if(objectiveHUD) {
            const objectiveHUDBottom = objectiveHUD.getBottom();
            y += objectiveHUDBottom;
            height -= objectiveHUDBottom;
        } else {
            y = 10;
            height = fullHeight - 10;
        }

        return {
            x:x+5,y:y+5,width:width-10,height:height-10
        }
    }

    this.addCustomRenderer = customRenderer => {
        return customRendererStack.addLayer(customRenderer);
    }
    this.removeCustomRenderer = ID => {
        customRendererStack.removeLayer(ID);
    }
    this.pushCustomRenderer = customRenderer => {
        const ID = customRendererStack.addLayer(customRenderer);
        customRendererStackIDLIFO.push(ID);
        return ID;
    }
    this.popCustomRenderer = () => {
        const ID = customRendererStackIDLIFO.pop();
        if(ID !== undefined) {
            customRendererStack.removeLayer(ID);
        }
    }
    this.clearCustomRendererStack = () => {
        customRendererStack.clearLayers();
        customRendererStackIDLIFO.splice(0);
    }
    const playerInteractionLocked = () => {
        if(playerMovementLocked) {
            return true;
        }
        if(escapeMenuShown) {
            return true;
        }
        if(popupActive) {
            return true;
        }
        if(this.prompt || this.popup) {
            return true;
        }
        return performance.now() < lastPopupCleared + WALK_AFTER_POPUP_DELAY;
    }
    this.playerInteractionLocked = playerInteractionLocked;
    this.lockPlayerMovement = function() {
        playerMovementLocked = true;
    }
    this.unlockPlayerMovement = function() {
        playerMovementLocked = false;
    }
    const escapeMenuDisabled = () => {
        return this.escapeMenuDisabled || playerInteractionLocked();
    }
    this.processKey = function(key) {
        if(key !== kc.accept) {
            this.playerController.processKey(key);
        }
        if(escapeMenuShown) {
            this.escapeMenu.processKey(key);
            return;
        }
        if(this.prompt) {
            switch(key) {
                case kc.accept:
                    if(enterReleased) {
                        this.prompt.confirmSelection();
                        enterReleased = false;
                        return;
                    } else {
                        return;
                    }
                case kc.up:
                    if(wDown) {
                        return;
                    }
                    this.prompt.moveSelection("up");
                    break;
                case kc.down:
                    if(sDown) {
                        return;
                    }
                    this.prompt.moveSelection("down");
                    break;
                case kc.left:
                    if(aDown) {
                        return;
                    }
                    this.prompt.moveSelection("left");
                    break;
                case kc.right:
                    if(dDown) {
                        return;
                    }
                    this.prompt.moveSelection("right");
                    break;
            }
        } else if(this.popup) {
            if(key === kc.accept) {
                if(enterReleased) {
                    if(this.popupProgressEnabled) {
                        this.popup.progress();
                    }
                    enterReleased = false;
                } else {
                    return;
                }
            }
        } else if(internalPlayerObject) {
            if(key === kc.accept && enterReleased) {
                if(enterReleased) {
                    enterReleased = false;
                    this.playerController.processKey(key);
                } else {
                    return;
                }
            }
        } else if(key === kc.accept) {
            enterReleased = false;
            return;
        }
        switch(key) {
            case kc.up:
                wDown = true;
                return;
            case kc.down:
                sDown = true;
                return;
            case kc.left:
                aDown = true;
                return;
            case kc.right:
                dDown = true;
                return;
        }
    }
    this.processKeyUp = function(key) {
        this.playerController.processKeyUp(key);
        if(escapeMenuShown) {
            this.escapeMenu.processKeyUp(key);
            return;
        }
        switch(key) {
            case kc.up:
                wDown = false;
                return;
            case kc.down:
                sDown = false;
                return;
            case kc.left:
                aDown = false;
                return;
            case kc.right:
                dDown = false;
                return;
            case kc.cancel:
                if(escapeMenuDisabled()) {
                    return;
                }
                escapeMenuShown = true;
                this.escapeMenu.show(()=>{
                    escapeMenuShown = false;
                });
                return;
            case kc.accept:
                enterReleased = true;
                return;
        }
    }
    this.processMove = function(x,y) {
        if(escapeMenuShown) {
            this.escapeMenu.processMove(x,y);
            return;
        }
    }
    this.processClick = function(x,y) {
        if(escapeMenuShown) {
            this.escapeMenu.processClick(x,y);
            return;
        }
    }
    this.processClickEnd = function(x,y) {
        if(escapeMenuShown) {
            this.escapeMenu.processClickEnd(x,y);
            return;
        }
    }
    let popupActive = false;
    this.clearTextPopup = () => {
        popupActive = false;
        this.popup = null;
        lastPopupCleared = performance.now();
    }
    this.popupActive = false;
    const showPopup = (pages,name=null,instant=false,instantSound=true) => {
        popupActive = true;
        if(Array.isArray(pages)) {
            return new Promise(async resolve => {
                for(let i = 0;i<pages.length;i++) {
                    await showPopup(pages[i],name,instant);
                }
                resolve();
            });
        }
        const page = pages;
        return new Promise(async resolve => {
            const now = performance.now();
            if(now < lastPopupCleared + POPUP_TIMEOUT) {
                await delay(POPUP_TIMEOUT - (now - lastPopupCleared));
            }
            this.popup = new WorldPopup(
                [page],
                () => {
                    this.clearTextPopup();
                    resolve();
                },name,instant,instantSound
            );
        });
    }

    this.say = text => showPopup([text]);
    this.speech = pages => showPopup(pages);
    this.ask = (question,...options) => this.showPrompt(question,...options);

    this.showPopup =         page =>        showPopup([page]);
    this.showPopups =        pages =>       showPopup(pages);
    this.showInstantPopup =  page =>        showPopup([page],null,true);
    this.showInstantPopups = pages =>       showPopup(pages,null,true);
    this.showNamedPopup =   (page,name) =>  showPopup([page],name);
    this.showNamedPopups =  (pages,name) => showPopup(pages,name);
    this.showInstantPopupSound = page => {
        playSound("energy");
        return showPopup([page],null,true,false);
    }
    this.clearPrompt = () => {
        this.prompt = null;
        lastPopupCleared = performance.now();
    }
    this.showPrompt = (question,...options) => {
        return new Promise(resolve => {
            this.prompt = new WorldPrompt(question,options,selectionIndex => {
                this.clearPrompt();
                resolve(selectionIndex);
            });
        });
    }
    this.showLetter = message => {
        return new Promise(resolve => {
            popupActive = true;
            this.popup = new LetterUI(message,()=>{
                popupActive = false;
                this.popup = null;
                lastPopupCleared = performance.now();
                resolve();
            });
        });
    }
    const outOfBounds = (x,y) => {
        return x < 0 || y < 0 || x > this.renderMap.finalColumn || y > this.renderMap.finalRow;
    }
    this.outOfBounds = outOfBounds;
    this.getTriggerState = function(x,y) {
        if(outOfBounds(x,y)) {
            return null;
        }
        const collisionType = this.renderMap.collision[getIdx(x,y)];
        if(COLLISTION_TRIGGERS[collisionType]) {
            return collisionType + COLLISION_TRIGGER_OFFSET;
        }
        return null;
    }
    this.getCollisionState = function(x,y,ignoreNoCollide) {
        if(outOfBounds(x,y)) {
            return {map: 1, object: null};
        }
        let mapCollision = this.renderMap.collision[getIdx(x,y)];
        let objectCollision = this.objectsLookup[x][y];
        if(!ignoreNoCollide) {
            if((this.map.noCollide && this.map.noCollide[
                mapCollision
            ]) || COLLISTION_TRIGGERS[
                mapCollision
            ])  {
                mapCollision = 0;
            }
            if(objectCollision && objectCollision.noCollide) {
                objectCollision = null;
            }
        } else if(COLLISTION_TRIGGERS[mapCollision]) {
            mapCollision = 0;
        }
        return {
            map: mapCollision,
            object: objectCollision
        }
    }
    this.collides = function(x,y,exemptionID) {
        const collisionState = this.getCollisionState(x,y,false);
        if(exemptionID && collisionState.object) {
            if(exemptionID === collisionState.object.ID) {
                collisionState.object = null;
            }
        }
        const collidesWithTile = collisionState.map >= 1 && collisionState.map < SPECIAL_COLLISION_START;
        const hasObject = collisionState.object ? true : false;
        return collidesWithTile || hasObject;
    }
    const getNextObjectID = function() {
        return `world_object_${lastID++}`;
    }
    this.getObject = function(objectID) {
        return this.objects[objectID];
    }
    this.getObjectID = function(object) {
        return object.ID;
    }
    this.addPlayer = function(x,y,...parameters) {
        const newPlayer = new PlayerRenderer(...parameters);
        this.pendingPlayerObject = newPlayer;
        return this.addObject(newPlayer,x,y);
    }
    const removeOffScreenObject = objectID => {
        for(let i = 0;i<offscreenObjects.length;i++) {
            if(offscreenObjects[i].ID === objectID) {
                offscreenObjects.splice(i,1);
                offscreenObjectCount--;
                break;
            }
        }
    }
    const registerOffscreenToggler = object => {
        const startWithOffscreen = object.offscreenRendering ? true : false;
        let offscreenRendering = startWithOffscreen;
        let world = this;
        if(startWithOffscreen) {
            delete object.offscreenRendering;
        }
        Object.defineProperty(object,"offscreenRendering",{
            get: function() {
                return offscreenRendering;
            },
            set: function(value) {
                if(typeof value !== "boolean") {
                    throw TypeError("Value 'offscreenRendering' must be of type 'boolean'!");
                }
                if(offscreenRendering) {
                    if(!value) {
                        // Turn off off-screen rendering for this object
                        offscreenRendering = false;
                        removeOffScreenObject(object.ID);
                        let x = object.x, y = object.y;
                        if(x < 0) {
                            x = 0;
                        } else if(x > world.renderMap.finalColumn) {
                            x = world.renderMap.finalColumn;
                        }
                        if(y < 0) {
                            y = 0;
                        } else if(y > world.renderMap.finalRow) {
                            y = world.renderMap.finalRow;
                        }
                        object.x = null;
                        object.y = null;
                        world.moveObject(object.ID,x,y,false);
                    }
                } else if(value) {
                    // Turn on off-screen rendering for this object
                    offscreenRendering = true;
                    world.objectsLookup[object.x][object.y] = null;
                    offscreenObjects.push(object);
                    offscreenObjectCount++;

                }
            }
        });
        if(startWithOffscreen) {
            offscreenObjects.push(object);
            offscreenObjectCount++;
        }
    }
    const collisionResolution = (existingObject,newObject,x,y) => {
        if(!this.collides(x,y-1)) {
            this.objectsLookup[x][y-1] = newObject;
            newObject.y--;
        } else if(!this.collides(x+1,y)) {
            this.objectsLookup[x+1][y] = newObject;
            newObject.x++;
        } else if(!this.collides(x,y+1)) {
            this.objectsLookup[x][y+1] = newObject;
            newObject.y++;
        } else if(!this.collides(x-1,y)) {
            this.objectsLookup[x-1][y] = newObject;
            newObject.x--;
        } else {
            console.error("Error: Object collision could not find a resolution");
            this.objectsLookup[x][y] = newObject;
        }
    }
    this.addObject = function(object,x,y) {
        const objectID = getNextObjectID();
        object.ID = objectID;
        registerOffscreenToggler(object);
        if(!isNaN(x) && !isNaN(y)) {
            object.x = x;
            object.y = y;
            if(object.worldPositionUpdated) {
                object.worldPositionUpdated(x,y,x,y,this,true);
            }
        } else if(isNaN(object.x) || !isNaN(object.y)) {
            console.error("Error: An object was supplied to the world renderer without initial coordinates");
        }
        object.world = this;
        this.objects[objectID] = object;
        if(object.offscreenRendering) {
            return objectID;
        }
        const existingItem = this.objectsLookup[object.x][object.y];
        if(existingItem) {
            console.error("Warning: An object collision has occured through the add object method");
            console.log("Existing item",existingItem,"New item",object);
            collisionResolution(existingItem,object,object.x,object.y);
        } else {
            this.objectsLookup[object.x][object.y] = object;
        }
        return objectID;
    }
    this.objectIDFilter = objectID => {
        if(typeof objectID === "object" && typeof objectID.ID === "string") {
            if(objectID.world !== this) {
                console.warn(`Object '${objectID.ID}' belongs to a different world!`);
            }
            return objectID;
        } else {
            return this.objects[objectID];
        }
    }
    this.removeObject = function(objectID) {
        const object = this.objectIDFilter(objectID);
        if(object.offscreenRendering) {
            removeOffScreenObject(object.ID);
        }
        if(object.isPlayer) {
            this.playerObject = null;
        }
        delete this.objects[object.ID];
        this.objectsLookup[object.x][object.y] = null;
    }
    this.moveObject = function(objectID,newX,newY,isInitialPosition=false) {
        const object = this.objectIDFilter(objectID);
        let oldX = object.x;
        let oldY = object.y;
        const hadNoPosition = oldX === null || oldY === null;
        if(hadNoPosition) {
            oldX = newX;
            oldY = newY;
            const oldObject = this.objectsLookup[oldX][oldY];
            if(oldObject) {
                console.error("Error: Shifting into this position loses an object on the lookup plane");
                console.log(`Position: ${newX},${newY}`,"Existing item",oldObject,"New item",object);
            }
        }
        if(object.offscreenRendering) {
            object.x = newX;
            object.y = newY;
            if(object.worldPositionUpdated) {
                object.worldPositionUpdated(oldX,oldY,newX,newY,this,isInitialPosition);
            }
            return;
        }
        if(!hadNoPosition) {
            this.objectsLookup[object.x][object.y] = null;
        }
        object.x = newX;
        object.y = newY;

        const existingObject = this.objectsLookup[object.x][object.y];
        if(existingObject) {
            console.warn("Warning: An object collision has occured through the move object method");
            console.log("Existing item",existingObject,"New item",object);
            collisionResolution(existingObject,object,newX,newY);
        } else {
            this.objectsLookup[object.x][object.y] = object;
        }
        if(object.worldPositionUpdated) {
            object.worldPositionUpdated(oldX,oldY,newX,newY,this,isInitialPosition);
        }
    }
    this.enableTileRendering = function() {
        tileRenderingEnabled = true;
    }
    this.disableTileRendering = function() {
        tileRenderingEnabled = false;
    }
    this.addDecal = decal => {
        this.decals[decal.x][decal.y] = decal;
    }
    this.removeDecal = decal => {
        this.decals[decal.x][decal.y] = null;
    }
    const getIdx = (x,y) => {
        return x + y * this.renderMap.columns;
    }
    const getLayer = (layer,x,y) => {
        return layer[getIdx(x,y)];
    }
    const changeLayer = (layer,value,x,y) => {
        layer[getIdx(x,y)] = value;
    }
    const changeLayerFilter = (layer,value,x,y,filter=IS_ZERO_FILTER) => {
        const index = getIdx(x,y);
        if(filter(layer[index])) {
            layer[index] = value;
        }
    }
    const lightingLayerFilter = () => {
        if(lightingLayerFilter) {
            return this.renderMap.lighting;
        } else {
            throw Error("This map does not have a lighting layer!");
        }
    }
    this.getCollisionTile = (x,y) => {
        return getLayer(this.renderMap.collision,x,y);
    }
    this.getForegroundTile = (x,y) => {
        return getLayer(this.renderMap.foreground,x,y);
    }
    this.getBackgroundTile = (x,y) => {
        return getLayer(this.renderMap.background,x,y);
    }
    this.getLightingTile = (x,y) => {
        return getLayer(lightingLayerFilter(),x,y);
    }
    this.setCollisionTile =  (value,x,y) => changeLayer(this.renderMap.collision,value,x,y);
    this.setForegroundTile = (value,x,y) => changeLayer(this.renderMap.foreground,value,x,y);
    this.setBackgroundTile = (value,x,y) => changeLayer(this.renderMap.background,value,x,y);
    this.setLightingTile =   (value,x,y) => changeLayer(lightingLayerFilter(),value,x,y);
    this.setCollisionTileFilter =  (value,x,y,filter) => changeLayerFilter(this.renderMap.collision,value,x,y,filter);
    this.setForegroundTileFilter = (value,x,y,filter) => changeLayerFilter(this.renderMap.foreground,value,x,y,filter);
    this.setBackgroundTileFilter = (value,x,y,filter) => changeLayerFilter(this.renderMap.background,value,x,y,filter);
    this.setLightingTileFilter =   (value,x,y,filter) => changeLayerFilter(lightingLayerFilter(),value,x,y,filter);
    this.updateMap = function(newMapName,data={}) {
        console.log(`World: Loading '${newMapName}'`);
        enterReleased = true;
        const runLoadCode = this.ranCustomLoader;
        if(runLoadCode) {
            pauseRenderer();
            drawLoadingText();
        }
        if(this.renderMap) {
            data.sourceRoom = this.renderMap.name;
        }
        const newMap = worldMaps[newMapName];
        if(this.map) {
            if(this.map.unload) {
                this.map.unload(this);
            }
            if(this.map.scriptTerminator) {
                this.map.scriptTerminator(this);
            }
        }
        if(!newMap) {
            throw Error(`Map '${newMapName}' does not exist in worldMaps`);
        }
        this.decals = [];
        this.objects = {};
        offscreenObjects = [];
        offscreenObjectCount = 0;
        this.playerObject = null;
        this.followObject = null;
        cameraXFollowEnabled = true;
        cameraYFollowEnabled = true;
        this.cameraResolveX = 0;
        this.cameraResolveY = 0;
        this.cameraFrozen = false;
        this.compositeProcessor = null;
        tileRenderingEnabled = true;
        this.clearCustomRendererStack();
        this.map = newMap.WorldState ? new newMap.WorldState(this,data):{};
        if(newMap.cameraStart) {
            this.camera.x = newMap.cameraStart.x;
            this.camera.y = newMap.cameraStart.y;
            this.camera.xOffset = 0;
            this.camera.yOffset = 0;
        }
        lightingLayerActive = false;
        this.renderMap = newMap;
        this.renderMap.background = newMap.baseData.background.slice(0);
        this.renderMap.foreground = newMap.baseData.foreground.slice(0);
        this.renderMap.collision = newMap.baseData.collision.slice(0);
        if(newMap.baseData.lighting) {
            this.renderMap.lighting = newMap.baseData.lighting.slice(0);
            lightingLayerActive = true;
        }
        let defaultBackgroundColor;
        if(this.defaultBackgroundColor) {
            defaultBackgroundColor = this.defaultBackgroundColor;
        } else {
            defaultBackgroundColor = DEFAULT_BACKGROUND_COLOR;
        }
        if(newMap.fxBackground) {
            backgroundRenderer = new newMap.fxBackground(this,data);
        } else if(newMap.backgroundColor) {
            backgroundColor = newMap.backgroundColor;
            backgroundRenderer = null;
        } else {
            backgroundColor = defaultBackgroundColor;
            backgroundRenderer = null;
        }
        this.objectsLookup = [];

        for(let y = 0;y < newMap.columns;y++) {
            const newRow = [];
            const newDecalRow = [];
            for(let x = 0;x < newMap.rows;x++) {
                newRow[x] = null;
                newDecalRow[x] = null;
            }
            this.objectsLookup[y] = newRow;
            this.decals[y] = newDecalRow;
        }

        this.updateSize();

        if(runLoadCode) {
            this.customLoader(resumeRenderer,true,data.sourceRoom);
        }
    }
    let currentTileSetName = null;
    this.refreshWorldTileset = () => {
        let startedLocked = playerMovementLocked;
        this.lockPlayerMovement();
        let didFinishLoading = false;
        (async ()=>{
            while(!didFinishLoading) {
                playTone(600,0.6);
                await delay(100);
            }
        })();
        ImageManager.loadImages(()=>{
            didFinishLoading = true;
            tileset = imageDictionary[currentTileSetName];
            playSound("energy");
            if(!startedLocked) {
                this.unlockPlayerMovement();
            }
        });
    }
    this.getTilesetImage = () => {
        return tileset;
    }
    this.setTilesetImage = name => {
        currentTileSetName = name;
        tileset = imageDictionary[name];
    }
    this.getTileSize = () => {
        return tileSize;
    }
    this.updateSize = function() {
        if(!didStartRenderer) {
            return;
        }
        let renderScale = 1;
        if(this.forcedRenderScale) {
            renderScale = this.forcedRenderScale;
        } else if(this.renderMap.renderScale) {
            renderScale = this.renderMap.renderScale;
        }
        let adjustedTileSize = WorldTileSize * renderScale;
        if(fullWidth < smallScaleSnapPoint) {
            adjustedTileSize *= 1.5;
        } else if(fullWidth < mediumScaleSnapPoint) {
            adjustedTileSize *= 2;
        } else {
            adjustedTileSize *= 2.5;
        }

        tileSize = Math.ceil(adjustedTileSize/16)*16;

        horizontalTiles =  Math.ceil(fullWidth / tileSize);
        verticalTiles = Math.ceil(fullHeight / tileSize);

        if(horizontalTiles % 2 === 0) {
            horizontalTiles++;
        }
        if(verticalTiles % 2 === 0) {
            verticalTiles++;
        }

        horizontalOffset = Math.round(halfWidth - horizontalTiles * tileSize / 2);
        verticalOffset = Math.round(halfHeight - verticalTiles * tileSize / 2);
        
        halfHorizontalTiles = Math.floor(horizontalTiles / 2);
        halfVerticalTiles = Math.floor(verticalTiles / 2);

        if(this.renderMap.fixedCamera) {
            if(verticalTiles < this.renderMap.rows || horizontalTiles < this.renderMap.columns) {
                this.fixedCameraOverride = true;
            } else {
                if(this.fixedCameraOverride) {
                    this.camera.x = this.renderMap.cameraStart.x;
                    this.camera.y = this.renderMap.cameraStart.y;
                    this.camera.xOffset = 0;
                    this.camera.yOffset = 0;
                }
                this.fixedCameraOverride = false;
            }
        }

        if(backgroundRenderer && backgroundRenderer.updateSize) {
            const updateSizeParameters = [
                tileSize,
                horizontalTiles,verticalTiles,
                horizontalOffset,verticalOffset
            ];
            backgroundRenderer.updateSize(...updateSizeParameters);
        }
        if(this.compositeProcessor) {
            this.compositeProcessor.updateSize();
        }

        if(lightingLayerActive || this.renderMap.usesLightSprites) {
            refreshLightTable(tileSize);
        }
    }
    this.autoCameraOff = () => {
        this.cameraFrozen = true;
    }
    this.autoCameraOn = () => {
        this.cameraFrozen = false;
    }
    this.moveCamera = async (x,y,xOffset,yOffset,duration) => {
        return new Promise(resolve => {
            const startTime = performance.now();
            const startX = this.camera.x + this.camera.xOffset;
            const startY = this.camera.y + this.camera.yOffset;
            const rangeX =  x + xOffset - startX;
            const rangeY =  y + yOffset - startY;
            this.cameraController = timestamp => {
                let tNormal = (timestamp - startTime) / duration;
                if(tNormal < 0) {
                    tNormal = 0;
                } else if(tNormal >= 1) {
                    this.camera.x = x;
                    this.camera.y = y;
                    this.camera.xOffset = xOffset;
                    this.camera.yOffset = yOffset;
                    this.cameraController = null;
                    resolve();
                    return;
                }
                const xPosition = startX + (rangeX * tNormal);
                const yPosition = startY + (rangeY * tNormal);

                const pureX = Math.floor(xPosition);
                const pureY = Math.floor(yPosition);
                const unpureX = xPosition - pureX;
                const unpureY = yPosition - pureY;

                this.camera.x = pureX;
                this.camera.y = pureY;
                this.camera.xOffset = unpureX;
                this.camera.yOffset = unpureY;
            }
        });
    }
    this.pushCamera = async (x,y,xOffset,yOffset,duration) => {
        return this.moveCamera(
            this.camera.x+x,
            this.camera.y+y,
            this.camera.xOffset+xOffset,
            this.camera.yOffset+yOffset,
            duration
        );
    }
    this.enableCameraXFollow = () => {
        cameraXFollowEnabled = true;
    }
    this.enableCameraYFollow = () => {
        cameraYFollowEnabled = true;
    }
    this.disableCameraXFollow = () => {
        cameraXFollowEnabled = false;
    }
    this.disableCameraYFollow = () => {
        cameraYFollowEnabled = false;
    }

    const processCameraResolve = timestamp => {
        if(this.cameraResolveX || this.cameraResolveY) {
            if(lastCameraResolve === null) {
                lastCameraResolve = timestamp;
            }
            const resolveDelta = (timestamp - lastCameraResolve) / CAMERA_RESOLVE_RATE;
            lastCameraResolve = timestamp;
            if(this.cameraResolveX < 0) {
                this.cameraResolveX += resolveDelta;
                if(this.cameraResolveX > 0) {
                    this.cameraResolveX = 0;
                }
            } else {
                this.cameraResolveX -= resolveDelta;
                if(this.cameraResolveX < 0) {
                    this.cameraResolveX = 0;
                }
            }
            if(this.cameraResolveY < 0) {
                this.cameraResolveY += resolveDelta;
                if(this.cameraResolveY > 0) {
                    this.cameraResolveY = 0;
                }
            } else {
                this.cameraResolveY -= resolveDelta;
                if(this.cameraResolveY < 0) {
                    this.cameraResolveY = 0;
                }
            }
            this.camera.xOffset += this.cameraResolveX;
            this.camera.yOffset += this.cameraResolveY;
        } else {
            lastCameraResolve = null;
        }
    }
    this.updateCamera = function(timestamp,movementLocked) {
        if(this.cameraController) {
            this.cameraController(timestamp);
        } else if((!this.renderMap.fixedCamera || this.fixedCameraOverride) && !this.cameraFrozen) {
            let followObject;
            if(this.followObject) {
                followObject = this.followObject;
            } else {
                followObject = internalPlayerObject;
            }
            if(followObject) {
                if(followObject.renderLogic) {
                    followObject.skipRenderLogic = true;
                    followObject.renderLogic(timestamp);
                }
                if(cameraXFollowEnabled) {
                    this.camera.x = followObject.x;
                    this.camera.xOffset = followObject.xOffset;
                }
                if(cameraYFollowEnabled) {
                    this.camera.y = followObject.y;
                    this.camera.yOffset = followObject.yOffset;
                }
                if(followObject.isPlayer) {
                    followObject.walkingOverride = movementLocked;
                }
            }
        }
        processCameraResolve(timestamp);
        if(this.renderMap.useCameraPadding) {
            const abolsuteCameraX = this.camera.x + this.camera.xOffset;
            const absoluteCameraY = this.camera.y + this.camera.yOffset;

            if(abolsuteCameraX - halfHorizontalTiles < this.renderMap.lowerHorizontalBound) {
                this.camera.x = halfHorizontalTiles + this.renderMap.lowerHorizontalBound;
                this.camera.xOffset = 0;   
            } else if(abolsuteCameraX + halfHorizontalTiles > this.renderMap.horizontalUpperBound) {
                this.camera.x = this.renderMap.horizontalUpperBound - halfHorizontalTiles;
                this.camera.xOffset = 0;
            }

            if(absoluteCameraY - halfVerticalTiles < this.renderMap.lowerVerticalBound) {
                this.camera.y = halfVerticalTiles + this.renderMap.lowerVerticalBound;
                this.camera.yOffset = 0;
            } else if(absoluteCameraY + halfVerticalTiles > this.renderMap.verticalUpperBound) {
                this.camera.y = this.renderMap.verticalUpperBound - halfVerticalTiles;
                this.camera.yOffset = 0;
            }
        }
    }
    this.render = function(timestamp) {
        this.processThreads(timestamp);

        if(tileRenderingEnabled) {
        
            const movementLocked = playerInteractionLocked();

            if(!movementLocked && this.playerController.renderMethod) {
                this.playerController.renderMethod(timestamp);
                if(paused) {
                    //This ensures that the world is not rendered before the loading segment plays, such as when the player changes map by a trigger.
                    return;
                }
            }

            if(backgroundRenderer) {
                backgroundRenderer.render(timestamp);
            } else {
                context.fillStyle = backgroundColor;
                context.fillRect(0,0,fullWidth,fullHeight);
            }

            const animationTileOffset = Math.floor(timestamp % ANIMATION_CYCLE_DURATION / ANIMATION_FRAME_TIME);
            this.updateCamera(timestamp,movementLocked);

            let verticalTileCount = verticalTiles;
            let horizontalTileCount = horizontalTiles;

            let adjustedYPos = this.camera.y - halfVerticalTiles;
            let adjustedXPos = this.camera.x - halfHorizontalTiles;

            let xStart = 0;
            let yStart = 0;

            if(this.camera.xOffset < 0) {
                xStart--;
            } else if(this.camera.xOffset > 0) {
                xStart--;
                horizontalTileCount++;
            }

            if(this.camera.yOffset < 0) {
                yStart--;
            } else if(this.camera.yOffset > 0) {
                yStart--;
                verticalTileCount++;
            }

            const xOffset = horizontalOffset - Math.round(this.camera.xOffset * tileSize);
            const yOffset = verticalOffset - Math.round(this.camera.yOffset * tileSize);

            const decalBuffer = [];
            const objectBuffer = [];
            const lightBuffer = [];

            let y = yStart, x;

            while(y < verticalTileCount) {
                x = xStart;

                while(x < horizontalTileCount) {

                    const xPos = adjustedXPos + x;
                    const yPos = adjustedYPos + y;

                    if(xPos < this.renderMap.columns && xPos >= 0 && yPos < this.renderMap.rows && yPos >= 0) {
                        const mapIndex = xPos + yPos * this.renderMap.columns;
                        
                        let backgroundValue = this.renderMap.background[mapIndex];
                        let foregroundValue = this.renderMap.foreground[mapIndex];
        
                        const xDestination = xOffset + x * tileSize;
                        const yDestination = yOffset + y * tileSize;

                        if(backgroundValue >= WorldTextureAnimationStart) {
                            backgroundValue += animationTileOffset;
                        }
                        if(foregroundValue >= WorldTextureAnimationStart) {
                            foregroundValue += animationTileOffset;
                        }

                        if(backgroundValue > 0) {
                            const textureX = backgroundValue % WorldTextureColumns * WorldTextureSize;
                            const textureY = Math.floor(backgroundValue / WorldTextureColumns) * WorldTextureSize;
                            context.drawImage(
                                tileset,
                                textureX,textureY,WorldTextureSize,WorldTextureSize,
                                xDestination,yDestination,tileSize,tileSize
                            );
                        }
                        if(foregroundValue > 0) {
                            const textureX = foregroundValue % WorldTextureColumns * WorldTextureSize;
                            const textureY = Math.floor(foregroundValue / WorldTextureColumns) * WorldTextureSize;
                            context.drawImage(
                                tileset,
                                textureX,textureY,WorldTextureSize,WorldTextureSize,
                                xDestination,yDestination,tileSize,tileSize
                            );
                        }

                        const decalRegister = this.decals[xPos][yPos];
                        if(decalRegister) {
                            decalBuffer.push(decalRegister,xDestination,yDestination);
                        }
                        const objectRegister = this.objectsLookup[xPos][yPos];
                        if(objectRegister) {
                            objectBuffer.push(objectRegister,xDestination,yDestination);
                        }

                        if(lightingLayerActive) {
                            const lightingValue = this.renderMap.lighting[mapIndex];
                            if(lightingValue) {
                                lightBuffer.push(
                                    lightingValue-1,
                                    xDestination,
                                    yDestination
                                );
                            }
                        }
                    }
                    x++;
                }
                y++;
            }

            let i = 0;
            while(i < offscreenObjectCount) {
                const object = offscreenObjects[i];
                const xDestination = (object.x - adjustedXPos) * tileSize + xOffset;
                const yDestination = (object.y - adjustedYPos) * tileSize + yOffset;
                objectBuffer.push(
                    object,xDestination,yDestination,
                );
                i++;
            }
            i = 0;
            while(i < decalBuffer.length) {
                decalBuffer[i].render(
                    timestamp,
                    decalBuffer[i+1],
                    decalBuffer[i+2],
                    tileSize,
                    tileSize
                );
                i += 3;
            }
            i = 0;
            while(i < objectBuffer.length) {
                objectBuffer[i].render(
                    timestamp,
                    objectBuffer[i+1],
                    objectBuffer[i+2],
                    tileSize,
                    tileSize
                );
                i += 3;
            }
            if(lightingLayerActive) {
                i = 0;
                while(i < lightBuffer.length) {
                    lightTable[lightBuffer[i]].render(
                        lightBuffer[i+1],
                        lightBuffer[i+2]
                    );
                    i += 3;
                }
            }
        } else {
            if(backgroundRenderer) {
                backgroundRenderer.render(timestamp);
            } else {
                context.fillStyle = backgroundColor;
                context.fillRect(0,0,fullWidth,fullHeight);
            }
        }
        this.postProcessor.render();
        if(this.compositeProcessor) {
            this.compositeProcessor.render();
        }
        if(objectiveHUD) {
            objectiveHUD.render(timestamp);
        }
        customRendererStack.render(timestamp);
        if(this.customRenderer) {
            this.customRenderer.render(timestamp);
        }
        if(escapeMenuShown) {
            this.escapeMenu.render(timestamp);
        }
        if(this.prompt) {
            this.prompt.render(timestamp);
        } else if(this.popup) {
            this.popup.render(timestamp);
        }
        if(alert) {
            if(!alert.render(timestamp)) {
                alert = null;
            }
        }
    }
}
export default WorldRenderer;
