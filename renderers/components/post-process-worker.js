const processorConfig = {
    MotionBlur: {
        renderer: MotionBlurEffect,
        settings: {
            postProcessBefore: true
        },
        renderCondition: () => frameNumber % 2 === 0
    },
    RedHell: {
        renderer: RedHell,
        settings: {
            postProcessBefore: false
        },
        renderCondition: () => frameNumber % 5 === 0
    },
    PolarInversion: {
        renderer: PolarInversionRenderer,
        settings: {
            postProcessBefore: false
        },
        renderCondition: () => frameNumber % 2 === 0
    }
}

function MotionBlurEffect(width,height) {
    const length = width * height * 4;
    this.process = sourceData => {
        let i = 0;
        while(i < length) {
            sourceData.data[i+3] = 200;
            i+=4;
        }
    }
}
function RedHell(width,height) {
    const length = width * height * 4;
    this.process = sourceData => {
        let i = 0;
        while(i < length) {
            sourceData.data[i] = 20;
            sourceData.data[i+3] = 50;
            i+=4;
        }
    }   
}
function PolarInversionRenderer(width,height) {
    this.amount = 1;
    this.drawPrecision = 1;
    const radius = Math.min(width,height) * 0.5;
    this.radiusSquared = radius * radius;

    this.xCenterOffset = width / 2;
    this.yCenterOffset = height / 2;

    this.process = sourceData => {
        const data = sourceData.data;
        const startData = new Uint8ClampedArray(data.length);
        startData.set(data);
        let y = 0, x = 0, relativeX, relativeY;
        while(y < height) {
            relativeY = y - this.yCenterOffset;
            x = 0;
            while(x < width) {
                relativeX = x - this.xCenterOffset;

                const invertDistance = 1 + this.amount * (this.radiusSquared / (relativeX * relativeX + relativeY * relativeY) - 1);
                const sampleX = (relativeX * invertDistance) + this.xCenterOffset;
                const sampleY = (relativeY * invertDistance) + this.yCenterOffset;

                let isOnSurface = false;
                if(sampleX >= 0 && sampleX <= width - 1 && sampleY >= 0) {
                    isOnSurface = sampleY <= height - 1;
                }
                if(isOnSurface && isFinite(sampleX) && isFinite(sampleY)) {
                    const sampleIndex = (Math.round(sampleX) + width * Math.round(sampleY)) * 4;
                    const destinationStart = (x + width * y) * 4;

                    data[destinationStart] = data[sampleIndex];
                    data[destinationStart+1] = data[sampleIndex+1];
                    data[destinationStart+2] = data[sampleIndex+2];
                    data[destinationStart+3] = data[sampleIndex+3];
                }
                x += this.drawPrecision;
            }
            y += this.drawPrecision;
        }
        y = 0;
        while(y < height) {
            x = 0;
            while(x < width) {
                const destination = (x + (sourceData.width * y)) * 4;
                if(data[destination] === startData[destination] &&
                    data[destination+1] === startData[destination+1] &&
                    data[destination+2] === startData[destination+2]
                ) {
                        data[destination+3] = 0;
                }
                x += this.drawPrecision;
            }
            y += this.drawPrecision;
        }
    }
}

var frameNumber = 0;
var busy = false;
var ready = false;
var rendering = false;
var processor = null;
var shouldRequestNewFrame = null;

this.onmessage = function(event) {
    const data = event.data;
    if(data.updateProcessor) {
        const config = processorConfig[data.newProcessor];
        processor = config.renderer;
        this.postMessage({
            updateSettings: true,
            settings: config.settings
        });
        shouldRequestNewFrame = config.renderCondition;
        return;
    }
    if(!rendering) {
        frameNumber++;
    }

    if(data.imageData && !busy) {
        busy = true;
        ready = false;
        this.postMessage({
            busy: true
        });
        processNewImageData(data);
    } else if(!busy && !ready) {
        if(shouldRequestNewFrame && shouldRequestNewFrame()) {
            ready = true;
            this.postMessage({
                ready: true
            });
        }
    }
}
async function processNewImageData(data) {
    rendering = true;
    const effect = new processor(
        data.width,data.height
    );
    effect.process(data.imageData);
    this.postMessage(data);
    busy = false;
    ready = false;
    rendering = false;
}
