function MoveSprite(objectID,steps) {
    const object = this.objectIDFilter(objectID);
    let promiseResolver = null;
    const promise = new Promise(resolve=>promiseResolver=resolve);
    const world = this;
    let lastCallback = () => {
        object.setWalking(false);
        object.renderLogic = null;
        promiseResolver();
    }
    for(let i = steps.length-1;i>=0;i--) {
        (function(step,callback){
            if(step.x || step.y) {
                lastCallback = () => {
                    let lastFrame = null, endValue, targetProperty, offsetProperty, xChangeRollover = 0,yChangeRollover = 0;
                    if(step.x) {
                        endValue = object.x + step.x;
                        targetProperty = "x";
                        if(step.x > 0) {
                            object.updateDirection("right");
                            xChangeRollover = 1;
                        } else {
                            object.updateDirection("left");
                            xChangeRollover = -1;
                        }
                    } else {
                        endValue = object.y + step.y;
                        targetProperty = "y";
                        if(step.y < 0) {
                            object.updateDirection("up");
                            yChangeRollover = -1;
                        } else {
                            object.updateDirection("down");
                            yChangeRollover = 1;
                        }
                    }
                    offsetProperty = targetProperty + "Offset";
                    const offsetRollover = xChangeRollover || yChangeRollover;
                    object.renderLogic = timestamp => {
                        if(!lastFrame) {
                            lastFrame = timestamp;
                            return;
                        }
                        const delta = timestamp - lastFrame;
                        lastFrame = timestamp;
                        let rolloverRequired;
                        const movementDifference = delta / 1000 * object.tilesPerSecond;
                        if(offsetRollover > 0) {
                            object[offsetProperty] += movementDifference;
                            rolloverRequired = object[offsetProperty] > 1;
                        } else {
                            object[offsetProperty] -= movementDifference;
                            rolloverRequired = object[offsetProperty] < -1;
                        }
                        if(rolloverRequired) {
                            object[offsetProperty] -= offsetRollover;
                            world.moveObject(object.ID,object.x+xChangeRollover,object.y+yChangeRollover,false);
                        }
                        if(endValue === object[targetProperty]) {
                            object[offsetProperty] = 0;
                            callback();
                        }
                    }
                }
            } else {
                lastCallback = () => {
                    object.renderLogic = null;
                    callback();
                }
            }
            
        })(steps[i],lastCallback);
    }
    object.setWalking(true);
    lastCallback();
    return promise;
}
export default MoveSprite;
