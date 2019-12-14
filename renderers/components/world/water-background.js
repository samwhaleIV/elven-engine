"use strict";

function WaterBackground(
    textureX,textureY,scrollDuration,world
) {
    this.textureX = textureX;
    this.textureY = textureY;
    this.scrollDuration = scrollDuration;

    let size;
    let pattern;

    const offscreenCanvas = new OffscreenCanvas(0,0);
    const offscreenContext = offscreenCanvas.getContext("2d");
    offscreenContext.imageSmoothingEnabled = false;
    const tileset = world.getTilesetImage();

    let xOffset = 0;
    let yOffset = 0;

    this.updateSize = (newSize,...parameters) => {
        xOffset = parameters[2];
        yOffset = parameters[3];

        size = newSize;

        offscreenCanvas.width = newSize;
        offscreenCanvas.height = newSize;

        offscreenContext.imageSmoothingEnabled = false;
        offscreenContext.drawImage(
            tileset,
            this.textureX,this.textureY,
            WorldTextureSize,WorldTextureSize,
            0,0,newSize,newSize
        );

        pattern = context.createPattern(offscreenCanvas,"repeat");
    }

    this.render = timestamp => {
        const offset = timestamp / this.scrollDuration % 1;

        const cameraXDistance = world.camera.x + world.camera.xOffset;
        const cameraYDistance = world.camera.y + world.camera.yOffset;

        const xOffsetDistance = offset + cameraXDistance;
        const yOffsetDistance = offset + cameraYDistance;

        context.fillStyle = pattern;
        context.save();
        context.beginPath();
        context.rect(0,0,fullWidth,fullHeight);
        context.translate(
            -xOffsetDistance*size + xOffset,
            -yOffsetDistance*size + yOffset
        );
        context.fill();
        context.restore();

        context.fillStyle = pattern;
        context.save();
        context.beginPath();
        context.rect(0,0,fullWidth,fullHeight);
        context.translate(
            (offset - cameraXDistance) * size + xOffset,
            -cameraYDistance * size + yOffset
        );
        context.globalCompositeOperation = "lighter";
        context.scale(-1,-1);
        context.fill();
        context.restore();
    }
}
function GetWaterBackground(
    textureX=0,textureY=0,scrollDuration=10000
) {
    return WaterBackground.bind(null,textureX,textureY,scrollDuration);
}
export default GetWaterBackground;
