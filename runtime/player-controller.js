const narrowResolutionThreshold = 0.15;
const inverseNarrowResolutionThreshold = 1 - narrowResolutionThreshold;

function PlayerController(world) {

    this.world = world;
    this.camera = world.camera;

    let player = null;
    let lastDirection = null;
    let lastWalking = null;

    Object.defineProperty(this,"player",{
        get: function() {
            return player;
        },
        set: function(newPlayer) {
            if(newPlayer) {
                if(lastDirection && lastWalking) {
                    newPlayer.updateDirection(lastDirection);
                }
                player = newPlayer;
            } else {
                if(player) {
                    lastDirection = player.direction;
                    lastWalking = player.isWalking();
                }
                player = newPlayer;
            }
        }
    });

    let wDown = false;
    let sDown = false;
    let aDown = false;
    let dDown = false;

    const movementDown = function() {
        return wDown || sDown || aDown || dDown;
    }
    const checkForSoloMovement = function() {
        let count = 0;
        let register = -1;

        if(wDown) {register = 0; count++;}
        if(sDown) {register = 1; count++;}
        if(aDown) {register = 2; count++;}
        if(dDown) {register = 3; count++;}

        return count >= 1 ? register : -1;
    }

    const addDirectionToCoordinate = function(x,y,direction) {
        switch(direction) {
            case "up":    y--; break;
            case "down":  y++; break;
            case "left":  x--; break;
            case "right": x++; break;
        }
        return {x:x,y:y};
    }

    const processEnter = () => {
        if(player.isWalking() || this.world.playerInteractionLocked()) {
            return;
        }
        const pulseLocation = addDirectionToCoordinate(
            player.x + Math.round(player.xOffset),
            player.y + Math.round(player.yOffset),
            player.direction
        );
        const collisionState = this.world.getCollisionState(
            pulseLocation.x,pulseLocation.y,true
        );
        const mapValue = collisionState.map;
        const objectValue = collisionState.object;
        if(objectValue) {
            if(objectValue.interacted) {
                objectValue.interacted(
                    pulseLocation.x,
                    pulseLocation.y,
                    invertDirection(player.direction)
                );
            }
        } else if(mapValue) {
            switch(mapValue) {
                case 2:
                    const doorIndex = (
                        this.world.renderMap.doorLookup[pulseLocation.x][pulseLocation.y]
                    );
                    this.world.map.doorClicked(doorIndex);
                    break;
                default:
                    if(mapValue < LogicLayerInteractStart ||
                        (mapValue >= SPECIAL_COLLISION_START && mapValue < CUSTOM_COLLISION_START)
                    ) {
                        break;
                    }
                    const worldClickedMethod = this.world.map.worldClicked;
                    if(worldClickedMethod) {
                        worldClickedMethod(
                            mapValue,
                            pulseLocation.x,
                            pulseLocation.y,
                            invertDirection(player.direction)
                        );
                    }
                    break;
            }
        } else {
            const otherClickedMethod = this.world.map.otherClicked;
            if(otherClickedMethod) {
                otherClickedMethod(
                    pulseLocation.x,
                    pulseLocation.y,
                    invertDirection(player.direction)
                );
            }
        }
    }

    const maxDelta = 50;

    this.horizontalVelocity = 0;
    this.verticalVelocity = 0;

    const cornerCollisionThreshold = 0;
    const inverseCornerCollisionThreshold = 0;

    const getSideCollision = (target,xDifference,yDifference) => {
        const offset = player[target];
        if(yDifference) {
            if(offset > cornerCollisionThreshold) {
                return this.world.collides(player.x+1,player.y+yDifference,player.ID);
            } else if(offset < 0) {
                return this.world.collides(player.x-1,player.y+yDifference,player.ID);
            }
        } else if(xDifference) {
            if(offset > inverseCornerCollisionThreshold) {
                return this.world.collides(player.x+xDifference,player.y+1,player.ID);
            } else if(offset < 0) {
                return this.world.collides(player.x+xDifference,player.y-1,player.ID);
            }
        }
        return false;
    }
    const polarizedEvaluation = (value,compareTo,positiveDifference) => {
        if(positiveDifference) {
            return value >= compareTo;
        } else {
            return value <= compareTo;
        }
    }
    const polarizedOverflowEvaluation = (value,positiveDifference) => {
        if(positiveDifference) {
            return value > 1;
        } else {
            return value < -1;
        }
    }
    const tryMove = (movementDistance,xDifference,yDifference) => {
        //Welcome to Hell.
        let positiveDifference, offsetTarget, sideTarget;
        if(xDifference) {
            positiveDifference = xDifference > 0;
            offsetTarget = "xOffset";
            sideTarget = "yOffset";
        } else if(yDifference) {
            positiveDifference = yDifference > 0;
            offsetTarget = "yOffset";
            sideTarget = "xOffset";
        } else {
            return false;
        }
        const sideCollision = getSideCollision(sideTarget,xDifference,yDifference);
        const valueAtThreshold = polarizedEvaluation(player[offsetTarget],0,positiveDifference);
        const lookAheadCollision = this.world.collides(
            player.x+xDifference,
            player.y+yDifference,
            player.ID
        );
        if((lookAheadCollision || sideCollision) && valueAtThreshold) {
            //console.log("Dead stop - Maximum position already reached");
            player[offsetTarget] = 0;
            return false;
        }

        player[offsetTarget] += movementDistance;
        const spaceThresholdReached = polarizedEvaluation(player[offsetTarget],0,positiveDifference);
        if((lookAheadCollision || sideCollision) && spaceThresholdReached) {
            //console.log("Dead stop - Already in XY space");
            player[offsetTarget] = 0;
            return false;    
        }
        const valueOverflowing = polarizedOverflowEvaluation(player[offsetTarget],positiveDifference);
        if(valueOverflowing) {
            if(positiveDifference) {
                player[offsetTarget]--;
            } else {
                player[offsetTarget]++;
            }
            this.world.moveObject(
                player.ID,
                player.x+xDifference,
                player.y+yDifference
            );
            const newSideCollision = getSideCollision(sideTarget,xDifference,yDifference);
            const newLookAhead = this.world.collides(
                player.x+xDifference,
                player.y+yDifference,
                player.ID
            );
            const newThreshold = polarizedEvaluation(player[offsetTarget],0,positiveDifference);
            if((newLookAhead || newSideCollision) && newThreshold) {
                //console.log("Dead stop - Post movement update");
                player[offsetTarget] = 0;
                return false;
            }
        }
        return true;
    }

    let lastFrame = null;

    let lastXOffset = 0;
    let lastXPolarity = false;

    let pendingDirection = null;

    const tryApplySoloMovementRegister = () => {
        const soloMovementRegister = checkForSoloMovement();
        if(soloMovementRegister >= 0) {
            switch(soloMovementRegister) {
                case 0: tryUpdateDirection("up");    break;
                case 1: tryUpdateDirection("down");  break;
                case 2: tryUpdateDirection("left");  break;
                case 3: tryUpdateDirection("right"); break;
            }
            applyPlayerVelocities();
            return true;
        } else {
            return false;
        }
    }

    const narrowResolutionHandler = () => {
        let polarity = 1;
        switch(player.direction) {
            case "up":
                polarity = -1;
            case "down":
                if(player.yOffset === 0) {
                    const ab = Math.abs(player.xOffset);
                    const collisionX = Math.round(player.xOffset + player.x);
                    if(ab < narrowResolutionThreshold || ab > inverseNarrowResolutionThreshold) {
                        const collisionTest =
                            world.collides(collisionX,player.y+polarity,player.ID) ||
                            world.collides(collisionX,player.y,player.ID);
                        if(!collisionTest) {
                            const change = collisionX - (player.x + player.xOffset);
                            world.cameraResolveX -= change;
                            player.xOffset = 0;
                            world.moveObject(player.ID,collisionX,player.y);
                            player.forceConvoyUpdate();
                        }
                    }
                }
                break;
            case "left":
                polarity = -1;
            case "right":
                if(player.xOffset === 0) {
                    const ab = Math.abs(player.yOffset);
                    const collisionY = Math.round(player.yOffset + player.y);
                    if(ab < narrowResolutionThreshold || ab > inverseNarrowResolutionThreshold) {
                        const collisionTest =
                            world.collides(player.x+polarity,collisionY,player.ID) ||
                            world.collides(player.x,collisionY,player.ID);
                        if(!collisionTest) {
                            const change = collisionY - (player.y + player.yOffset);
                            world.cameraResolveY -= change;
                            player.yOffset = 0;
                            world.moveObject(player.ID,player.x,collisionY);
                            player.forceConvoyUpdate();
                        }
                    }
                }
                break;
        }
    }

    const movementMethod = timestamp => {
        if(pendingDirection) {
            player.updateDirection(pendingDirection);
            applyPlayerVelocities();
            pendingDirection = null;
        }
        if(ENV_FLAGS.DEBUG_MICRO_SHIFT) {
            if(lastXOffset > player.xOffset) {
                if(!lastXPolarity) {
                    console.log("Player controller: Micro direction shift!");
                }
                lastXPolarity = true;
            } else {
                if(lastXPolarity) {
                    console.log("Player controller: Micro direction shift!");
                }
                lastXPolarity = false;
            }
            lastXOffset = player.xOffset;
            console.log(player.xOffset);
        }
        if(!lastFrame) {
            lastFrame = timestamp;
        }
        const delta = timestamp - lastFrame;
        lastFrame = timestamp;
        if(delta > maxDelta) {
            if(ENV_FLAGS.MOVEMENT_FRAME_WARNING) {
                console.warn("Player controller: Dropped movement frame");
            }
            return;
        }
        const movementDistance = delta / 1000 * player.tilesPerSecond;

        let walking = false;
        if(this.horizontalVelocity > 0) {
            walking = tryMove(movementDistance,1,0);
        } else if(this.horizontalVelocity < 0) {
            walking = tryMove(-movementDistance,-1,0);
        }
        if(this.verticalVelocity > 0) {
            walking = tryMove(movementDistance,0,1);
        } else if(this.verticalVelocity < 0) {
            walking = tryMove(-movementDistance,0,-1);
        }
        if(player.triggerState) {
            player.impulseTrigger(this.world,false);
        }
        player.setWalking(walking);
        if(!walking) {
            narrowResolutionHandler();
        }
    }

    let loopRunning = false;
    this.renderMethod = null;

    const startMovementLoop = () => {
        loopRunning = true;
        this.renderMethod = movementMethod;
    }
    const stopMovementLoop = () => {
        this.renderMethod = null;
        loopRunning = false;
        lastFrame = null;
        player.setWalking(false);
    }

    const applyPlayerVelocities = () => {
        this.horizontalVelocity = 0;
        this.verticalVelocity = 0;
        switch(player.direction) {
            case "up":    this.verticalVelocity = -1;   break;
            case "down":  this.verticalVelocity = 1;    break;
            case "left":  this.horizontalVelocity = -1; break;
            case "right": this.horizontalVelocity = 1;  break;
        }
    }

    const tryUpdateDirection = direction => {
        if(this.world.playerInteractionLocked()) {
            pendingDirection = direction;
            return;
        }
        player.updateDirection(direction);
    }

    this.processKey = function(key) {
        const worldHasPlayer = player ? true : false;
        switch(key) {
            case kc.up:
                wDown = true;
                if(!worldHasPlayer) return;
                tryUpdateDirection("up");
                break;
            case kc.down:
                sDown = true;
                if(!worldHasPlayer) return;
                tryUpdateDirection("down");
                break;
            case kc.left:
                aDown = true;
                if(!worldHasPlayer) return;
                tryUpdateDirection("left");
                break;
            case kc.right:
                dDown = true;
                if(!worldHasPlayer) return;
                tryUpdateDirection("right");
                break;
            case kc.accept:
                if(!worldHasPlayer) return;
                processEnter();
                return;
            default:
                return;
        }
        applyPlayerVelocities();
        if(movementDown() && !loopRunning) {
            startMovementLoop();
        }
    }
    this.processKeyUp = function(key) {
        switch(key) {
            case kc.up:    wDown = false; break;
            case kc.down:  sDown = false; break;
            case kc.left:  aDown = false; break;
            case kc.right: dDown = false; break;
            default: return;
        }
        if(player && !tryApplySoloMovementRegister()) {
            pendingDirection = null;
            stopMovementLoop();
        }
    }
}
export default PlayerController;
