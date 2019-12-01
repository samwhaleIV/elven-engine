const maxIntensity = 100;
const getIntenseColor = (r,g,b,intensity) => {
    return `rgba(${r},${g},${b},${intensity/maxIntensity})`;
}
const getColoredStops = (r,g,b,intensity) => {
    return [
        [getIntenseColor(r,g,b,intensity),0],
        [getIntenseColor(r,g,b,0),1]
    ];
}
const getWhiteStops = intensity => {
    return getColoredStops(255,255,255,intensity);
}
const getBlackStops = intensity => {
    return getColoredStops(0,0,0,intensity);
}

const gradientBufferCanvas = new OffscreenCanvas(0,0);
const gradientBufferContext = gradientBufferCanvas.getContext(
    "2d",{alpha:true}
);

let gradientSize = null;
let gradientQuarterSize = null;

const renderGradient = function(x,y) {
    context.drawImage(
        this.image,0,0,
        gradientSize,gradientSize,
        x-gradientQuarterSize,
        y-gradientQuarterSize,
        gradientSize,gradientSize
    );
}
const gradientManifest = [
    getBlackStops(100),
    getWhiteStops(100),
    getBlackStops(50),
    getWhiteStops(50),
    getBlackStops(25),
    getWhiteStops(10),
    getBlackStops(75),
    getWhiteStops(75),
    getColoredStops(147,255,255,75),
    getColoredStops(255,0,0,75),
    getColoredStops(0,255,0,75),
    getColoredStops(219,166,105,75),
    getColoredStops(255,233,0,75),
    getColoredStops(124,55,255,75),
    getColoredStops(198,0,151,75),
    getWhiteStops(10)
];
gradientManifest.forEach((stops,index) => {
    gradientManifest[index] = {
        stops: stops,
        image: null,
        render: null
    }
});
gradientManifest.push({
    custom: true,
    render: (x,y) => {
        if(this.compositeProcessor && this.compositeProcessor.queueRegion) {
            this.compositeProcessor.queueRegion(x,y,tileSize);
        }
    }
});
const updateHighDPIGradients = tileSize => {
    const size = tileSize * 2;
    const halfSize = tileSize;

    gradientBufferCanvas.width = size;
    gradientBufferCanvas.height = size;

    gradientManifest.forEach(gradient => {
        if(gradient.custom) {
            return;
        }
        if(gradient.image) {
            gradient.image.close();
        }
        gradientBufferContext.clearRect(
            0,0,size,size
        );
        const radialGradient = gradientBufferContext.createRadialGradient(
            halfSize,halfSize,0,halfSize,halfSize,halfSize
        );
        gradient.stops.forEach(stop=>{
            radialGradient.addColorStop(stop[1],stop[0]);
        });
        gradientBufferContext.fillStyle = radialGradient;
        gradientBufferContext.fillRect(0,0,size,size);

        gradient.image = gradientBufferCanvas.transferToImageBitmap();
        gradient.render = renderGradient.bind(gradient);
    });
    gradientSize = size;
    gradientQuarterSize = gradientSize / 4;
}
function GetLightTableReferences() {
    return {
        updateSize: updateHighDPIGradients,
        table: gradientManifest
    }
}
export default GetLightTableReferences;
