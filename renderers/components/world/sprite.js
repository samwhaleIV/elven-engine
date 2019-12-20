import { AlertSound } from "../../../runtime/tones.js";
import MultiLayer from "../multi-layer.js";

const SPRITE_WIDTH = 16;
const SPRITE_HEIGHT = 16;

const ELF_WIDTH = 9;
const ELF_HEIGHT = 20;
const FOOTSTEPS_SPRITE_NAME = "footsteps";
const PLAYER_SPRITE_NAME = "player";
const ELF_HACK_SPRITE = "wimpy-red-elf";

const CONVOY_ALIGNMENT = 1;

const SPRITE_ALERT_TIMEOUT = 500;

const STAIR_HEIGHT = 0.75;
const ELEVATION_TILE = 28;

const CONVOY_RENDER_SORT = (a,b) => {
    return a.y - b.y;
};

function ElfRenderer(startDirection,spriteName) {
    SpriteRenderer.call(this,startDirection,spriteName,ELF_WIDTH,ELF_HEIGHT);
}
function PlayerRenderer(startDirection,isFakePlayer=false,customSprite) {
    if(ENV_FLAGS.ELF_PLAYER_HACK) {
        ElfRenderer.call(this,startDirection,ELF_HACK_SPRITE);
    } else {
        SpriteRenderer.call(
            this,startDirection,customSprite ? customSprite : PLAYER_SPRITE_NAME
        );
    }
    if(!isFakePlayer && ENV_FLAGS.DEBUG_PLAYER_CONVOY) {
        this.convoyAdd(
            new PlayerRenderer(null,true),
            new PlayerRenderer(null,true),
            new PlayerRenderer(null,true)
        );
    }
    this.isPlayer = isFakePlayer ? false : true;
    this.tilesPerSecond = 5;
}
function SpriteRenderer(startDirection,spriteName,customColumnWidth,customColumnHeight) {
    const sprite = imageDictionary[`sprites/${spriteName}`];
    if(customColumnWidth === "auto") {
        customColumnWidth = sprite.width;
    }
    if(customColumnHeight === "auto") {
        customColumnHeight = sprite.height;
    }
    const footStepsSprite = imageDictionary[`sprites/${FOOTSTEPS_SPRITE_NAME}`];
    const customSize = customColumnWidth || customColumnHeight ? true : false;

    const customWidthRatio = customColumnHeight / customColumnWidth;
    const worldScaleTranslation = customColumnWidth / SPRITE_WIDTH;

    const columnWidth = customColumnWidth ? customColumnWidth : SPRITE_WIDTH;
    const rowHeight = customColumnHeight ? customColumnHeight : SPRITE_HEIGHT;
    const rowCount = 4;

    const footstepWidth = 16;
    const footstepHeight = 16;

    let walking = false;
    let currentColumn = 0;

    this.animationFrameTime = 1000 / 12;

    this.direction = null;

    this.tilesPerSecond = 2.5;

    Object.defineProperty(this,"speed",{
        get: function() {
            return this.tilesPerSecond;
        },
        set: function(value) {
            this.setSpeed(value);
        }
    });

    let tmpSpeed;

    this.setSpeed = speed => {
        tmpSpeed = this.tilesPerSecond;
        this.tilesPerSecond = speed;
    }
    this.restoreSpeed = () => {
        this.tilesPerSecond = tmpSpeed;
    }

    this.xOffset = 0;
    this.yOffset = 0;

    const maxFootStepCount = 2;
    const footStepBuffer = [];

    let convoyPath = [];

    const convoy = [];
    let convoyCount = 0;

    let lastX = null;
    let lastY = null;
    this.firstPosition = true;

    const convoyAdd = object => {
        convoy.push(object);
        object.x = 0;
        object.y = 0;
        object.xOffset = 0;
        object.yOffset = 0;
        object.lastRenderX = -100;
        object.lastRenderY = -100;
        object.convoyMember = true;
        if(this.world) {
            this.object.world = this.world;
        }
        convoyCount++;
    }
    this.convoyAdd = (...objects) => objects.forEach(convoyAdd);

    const modifyConvoy = method => {
        const removed = convoy[method]();
        convoyCount = convoy.length;
        if(!convoyCount) {
            convoyPath.splice(0,convoyPathCount);
            convoyPathCount = 0;
        }
        removed.convoyMember = false;
        return removed;
    }

    this.convoyRemoveFirst = () => modifyConvoy("shift");
    this.convoyRemoveLast = () => modifyConvoy("pop");

    Object.defineProperty(this,"convoyLength",{
        get: function() {
            return convoy.length;
        }
    });

    const setConvoyWalking = isWalking => {
        let i = 0;
        while(i < convoyCount) {
            convoy[i].setWalking(isWalking);
            i++;
        }
    }

    const getConvoyPosition = convoyIndex => {
        const endLength = (convoyIndex + 1) * CONVOY_ALIGNMENT;
        let pathIndex = 1;
        let lastPath = convoyPath[0];
        let lengthBuffer = endLength;
        while(pathIndex < convoyPath.length) {
            const nextPath = convoyPath[pathIndex];

            const xDistance = Math.abs(lastPath.x-nextPath.x);
            const yDistance = Math.abs(lastPath.y-nextPath.y);

            const distance = Math.max(xDistance,yDistance);

            if(lengthBuffer > distance) {
                lengthBuffer -= distance;
                pathIndex++;
                lastPath = nextPath;
            } else {
                if(xDistance === distance) {
                    return {
                        direction: lastPath.direction,
                        x: lastPath.direction === "left" ? lastPath.x + lengthBuffer : lastPath.x - lengthBuffer,
                        y: lastPath.y
                    };
                } else {
                    return {
                        direction: lastPath.direction,
                        x: lastPath.x,
                        y: lastPath.direction === "up" ? lastPath.y + lengthBuffer : lastPath.y - lengthBuffer
                    };
                }
            }
        }
        const finalPath = convoyPath[convoyPath.length-1];
        return finalPath;
    }
    this.forceConvoyUpdate = () => {
        if(!convoyCount) {
            return;
        }
        const calculatedX = this.x + this.xOffset;
        const calculatedY = this.y + this.yOffset;
        convoyPath.unshift({
            direction: this.direction,
            x: calculatedX,
            y: calculatedY
        });
    }
    const renderConvoy = (timestamp,x,y,width,height) => {
        const calculatedX = this.x + this.xOffset;
        const calculatedY = this.y + this.yOffset;
        if(lastX !== calculatedX || lastY !== calculatedY) {
            const frontPath = convoyPath[0];
            if(!frontPath) {
                convoyPath[0] = {
                    direction: this.direction,
                    x: calculatedX,
                    y: calculatedY
                };
                convoyPath[1] = {
                    direction: this.direction,
                    x: calculatedX,
                    y: calculatedY
                };
            } else {
                if(this.direction !== frontPath.direction) {
                    convoyPath.unshift({
                        direction: this.direction,
                        x: calculatedX,
                        y: calculatedY
                    });
                } else {
                    frontPath.x = calculatedX;
                    frontPath.y = calculatedY;
                }
            }
            setConvoyWalking(true);
        } else {
            setConvoyWalking(false);
        }
        lastX = calculatedX;
        lastY = calculatedY;

        if(ENV_FLAGS.CONVOY_TRACE) {
            const xOffset = width / 2;
            const yOffset = height / 2;
            context.beginPath();
            context.lineWidth = 2;
            context.strokeStyle = "red";
            for(let i = 0;i<convoyPath.length;i++) {
                const path = convoyPath[i];
                const lineX = xOffset + x + (path.x - this.x) * width;
                const lineY = yOffset + y + (path.y - this.y) * height;
                if(i === 0) {
                    context.moveTo(lineX,lineY);
                } else {
                    context.lineTo(lineX,lineY);
                }
                context.fillStyle = "blue";
                context.fillRect(lineX-5,lineY-5,10,10);
            } 
            context.stroke();
        }

        const renderStack = [];
        let convoyIndex = 0;
        while(convoyIndex < convoyCount) {
            const follower = convoy[convoyIndex];
            const convoyPosition = getConvoyPosition(convoyIndex);
            follower.updateDirection(convoyPosition.direction);
            renderStack.unshift({
                follower: follower,
                x: x + (convoyPosition.x - this.x) * width,
                y: y + (convoyPosition.y - this.y) * height
            });
            convoyIndex++;
        }
        const renderStackSize = renderStack.length;
        renderStack.sort(CONVOY_RENDER_SORT);
        let i = 0;
        let renderedSelf = false;
        const renderY = Math.round(y+this.yOffset*height);
        if(renderY < renderStack[0].y) {
            this.renderSelf(x,y,width,height);
            renderedSelf = true;
        }
        while(i<renderStackSize) {
            const renderOperation = renderStack[i];
            renderOperation.follower.render(
                timestamp,
                renderOperation.x,renderOperation.y,
                width,height
            );
            i++;
        }
        if(!renderedSelf) {
            this.renderSelf(x,y,width,height);
        }
    }
    const getStairVerticalOffset = (trueX,trueY) => {
        //This code is x and y redundant. For the love of god refactor it when you get a chance.

        const lerpXStart = Math.floor(trueX);
        const lerpXEnd = Math.ceil(trueX);
        const lerpYStart = Math.floor(trueY);
        const lerpYEnd = Math.ceil(trueY);

        let leftOffsetValue = this.world.getCollisionTile(lerpXStart,this.y);
        let rightOffsetValue = this.world.getCollisionTile(lerpXEnd,this.y);
        let upOffsetValue = this.world.getCollisionTile(this.x,lerpYStart);
        let downOffsetValue = this.world.getCollisionTile(this.x,lerpYEnd);

        const adjustedStairHeight = STAIR_HEIGHT + this.renderYOffset;

        if(leftOffsetValue !== ELEVATION_TILE) {
            leftOffsetValue = 0;
        } else {
            leftOffsetValue = -adjustedStairHeight;
        }
        if(rightOffsetValue !== ELEVATION_TILE) {
            rightOffsetValue = 0;
        } else {
            rightOffsetValue = -adjustedStairHeight;
        }
        if(upOffsetValue !== ELEVATION_TILE) {
            upOffsetValue = 0;
        } else {
            upOffsetValue = -adjustedStairHeight;
        }
        if(downOffsetValue !== ELEVATION_TILE) {
            downOffsetValue = 0;
        } else {
            downOffsetValue = -adjustedStairHeight;
        }
        let offset = 0;

        if(this.xOffset >= 0) {
            offset = Math.lerp(leftOffsetValue,rightOffsetValue,this.xOffset);
        } else {
            offset = Math.lerp(rightOffsetValue,leftOffsetValue,-this.xOffset);
        }
        
        if(downOffsetValue !== upOffsetValue) {
            if(this.yOffset > 0) {
                offset = Math.lerp(upOffsetValue,downOffsetValue,this.yOffset);
            } else {
                offset = Math.lerp(downOffsetValue,upOffsetValue,-this.yOffset);
            }
        }
        return offset;
    }

    this.worldPositionUpdated = function(oldX,oldY,newX,newY,world,initial) {
        if(!initial) {
            const decalSourceX = this.direction === "up" || this.direction === "down" ? 0 : footstepWidth;
            const xOffset = this.xOffset;
            const yOffset = this.yOffset;
            const newFootStep = {
                x: newX,
                y: newY,
                render: (timestamp,x,y,width,height) => {
                    const horizontalOffset = xOffset * width;
                    const verticalOffset = yOffset * height;
                    context.drawImage(
                        footStepsSprite,
                        decalSourceX,0,
                        footstepWidth,footstepHeight,
                        x+horizontalOffset,y+verticalOffset,
                        width,height
                    );
                }
            }
            const shouldPushNew = FootPrintTiles[
                world.renderMap.background[
                    (newX + Math.round(xOffset)) + (newY + Math.round(yOffset)) * world.renderMap.columns
                ]
            ];
            if(footStepBuffer.length < maxFootStepCount) {
                if(shouldPushNew) {
                    footStepBuffer.push(newFootStep);
                    world.addDecal(newFootStep);
                } else if(footStepBuffer.length > 0) {
                    const removedDecal = footStepBuffer.shift();
                    world.removeDecal(removedDecal);
                }
            } else {
                const removedDecal = footStepBuffer.shift();
                world.removeDecal(removedDecal);
                if(shouldPushNew) {
                    footStepBuffer.push(newFootStep);
                    world.addDecal(newFootStep);
                }
            }
        }
        if(!this.isPlayer) {
            return;
        }
        this.triggerState = world.getTriggerState(newX,newY);
        if(!this.triggerState) {
            this.lastActive = null;
        }
        this.impulseTrigger(world,initial);
    }

    this.impulseTrigger = (world,initial=false) => {
        if(this.triggerState && !initial) {
            if(this.lastActive === this.triggerState) {
                return;
            }
            const result = world.map.triggerImpulse(this.triggerState,this.direction);
            if(result === TRIGGER_ACTIVATED) {
                this.lastActive = this.triggerState;
            } else {
                this.lastActive = null;
            }
        }
    }

    let specialRow = null;
    let lastSpecialFrame;

    this.setSpecialFrame = function(frameID) {
        if(frameID < 0) {
            this.updateDirection(
                this.direction
            );
            specialRow = null;
            return;
        }
        currentColumn = 4 * columnWidth + Math.floor(frameID / 4);
        specialRow = (frameID % 4) * rowHeight;
        lastSpecialFrame = frameID;
    }
    this.getSpecialFrame = () => {
        if(specialRow === null) {
            return null;
        } else {
            return lastSpecialFrame;
        }
    }

    this.updateDirection = function(direction) {
        specialRow = null;
        switch(direction) {
            case "down":
                currentColumn = 0;
                break;
            case "up":
                currentColumn = columnWidth;
                break;
            case "right":
                currentColumn = columnWidth + columnWidth;
                break;
            case "left":
                currentColumn = columnWidth * 3;
                break;
        }
        this.direction = direction;
    }

    this.setWalking = function(isWalking) {
        walking = isWalking;
    }
    this.isWalking = function() {
        return walking;
    }

    if(startDirection) {
        this.updateDirection(startDirection);
    } else {
        this.updateDirection("down");
    }
    
    this.walkingOverride = false;
    this.renderLogic = null;

    let showingAlert = false;
    
    const alertResolvers = [];
    let alertTimeout = null;
    this.alert = () => {
        return new Promise(resolve=>{
            if(alertTimeout !== null) {
                clearTimeout(alertTimeout);
            }
            alertResolvers.push(resolve);
            AlertSound();
            showingAlert = true;
            alertTimeout = setTimeout(() => {
                alertResolvers.forEach(resolver=>resolver());
                alertResolvers.splice(0);
                showingAlert = false;
            },SPRITE_ALERT_TIMEOUT);
        });
    }
    const alertSprite = imageDictionary["sprites/alert"];

    this.hidden = false;
    
    Object.defineProperty(this,"location",{
        get: function() {
            return [this.x,this.y,this.xOffset,this.yOffset];
        }
    });

    this.skipRenderLogic = true;

    this.overlay = new MultiLayer();

    this.renderXOffset = 0;
    this.renderYOffset = 0;

    const processRenderLogicForFrame = timestamp => {
        if(this.skipRenderLogic) {
            this.skipRenderLogic = false;
        } else if(this.renderLogic) {
            this.renderLogic(timestamp);
        }
    }
    let startX, startY, recentTimestamp;
    if(customSize) {
        this.renderSelf = function(x,y,width,height) {

            let renderWidth = width * worldScaleTranslation;
            let renderHeight = customWidthRatio * renderWidth;

            const renderXOffset = (width - renderWidth) / 2;
            const renderYOffset = height - renderHeight;

            const destinationX = (this.xOffset * width + x + (this.x - startX) * width) + renderXOffset;
            const destinationY = (this.yOffset * height + y + (this.y - startY) * height) + renderYOffset;

            const animationRow = specialRow !== null ? specialRow : !this.walkingOverride && walking ? 
                Math.floor(recentTimestamp / this.animationFrameTime) % rowCount * rowHeight
            : 0;

            renderWidth = Math.round(renderWidth);
            renderHeight = Math.round(renderHeight);

            context.drawImage(
                sprite,currentColumn,animationRow,columnWidth,rowHeight,
                destinationX,destinationY,
                renderWidth,
                renderHeight
            );
            this.overlay.render(recentTimestamp,destinationX,destinationY,renderWidth,renderHeight);
            if(showingAlert) {
                context.drawImage(
                    alertSprite,x,destinationY-height,width,height
                );
            }
        }
    } else {
        this.renderSelf = function(x,y,width,height) {
            const destinationX = this.xOffset * width + x + (this.x - startX) * width;
            const destinationY = this.yOffset * height + y + (this.y - startY) * height;
            const animationRow = specialRow !== null ? specialRow : !this.walkingOverride && walking ? 
                Math.floor(recentTimestamp / this.animationFrameTime) % rowCount * rowHeight
            : 0;
            context.drawImage(
                sprite,currentColumn,animationRow,columnWidth,rowHeight,destinationX,destinationY,width,height
            );
            this.overlay.render(recentTimestamp,destinationX,destinationY,width,height);
            if(showingAlert) {
                context.drawImage(
                    alertSprite,destinationX,destinationY-height,width,height
                );
            }
        }
    }
    this.render = function(timestamp,x,y,width,height) {
        x += Math.floor(width * this.renderXOffset);
        y += Math.floor(height * this.renderYOffset);
        recentTimestamp = timestamp;
        startX = this.x;
        startY = this.y;
        processRenderLogicForFrame(timestamp);
        if(this.hidden) {
            return;
        }
        if(convoyCount) {
            renderConvoy(timestamp,x,y,width,height);
        } else {
            const trueX = this.x + this.xOffset;
            const trueY = this.y + this.yOffset;
            if(this.world && !this.convoyMember && !this.world.outOfBounds(
                trueX,trueY
            )) {
                y += height * getStairVerticalOffset(
                    trueX,trueY
                );
            }
            this.renderSelf(x,y,width,height);
        }
    }
}
export default SpriteRenderer;
export { PlayerRenderer, SpriteRenderer, ElfRenderer };
