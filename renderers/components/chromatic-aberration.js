const red =   "rgb(255,0,0)";
const green = "rgb(0,255,0)";
const blue =  "rgb(0,0,255)";

function GetDefaultOffsets() {
    return {
        x: 0,
        y: 0
    }
}
function ChromaticAberration() {
    let width = 0, height = 0;

    const resetDimensions = () => {
        if(fullWidth !== undefined) {
            width = fullWidth;
        }
        if(fullHeight !== undefined) {
            height = fullHeight;
        }
    }
    resetDimensions();

    const offscreenCanvas = new OffscreenCanvas(
        width,height
    );
    const offscreenContext = offscreenCanvas.getContext(
        "2d",{alpha:false}
    );

    const offscreenBufferCanvas = new OffscreenCanvas(
        width,height
    );
    const offscreenBufferContext = offscreenBufferCanvas.getContext(
        "2d",{alpha:false}
    );

    const refreshCanvas = () => {
        resetDimensions();

        offscreenCanvas.width = width;
        offscreenCanvas.height = height;

        offscreenBufferCanvas.width = width;
        offscreenBufferCanvas.height = height;
    }

    let enabled = false;
    this.enable = () => {
        enabled = true;
    }
    this.disable = () => {
        enabled = false;
    }
    const redOffsets = GetDefaultOffsets();
    const greenOffsets = GetDefaultOffsets();
    const blueOffsets = GetDefaultOffsets();

    this.setOffsets = (channel,x,y) => {
        switch(channel) {
            case "r":
            case "red":
                channel = redOffsets; break;
            case "g":
            case "green":
                channel = greenOffsets; break;
            case "b":
            case "blue":
                channel = blueOffsets; break;
            default:
                return;
        }
        channel.x = x;
        channel.y = y;
    }
    const gradeOffscreenCanvas = color => {
        offscreenContext.globalCompositeOperation = "source-over";
        offscreenContext.drawImage(
            offscreenBufferCanvas,0,0,width,height,0,0,width,height
        );
        offscreenContext.globalCompositeOperation = "multiply";
        offscreenContext.fillStyle = color;
        offscreenContext.fillRect(0,0,width,height);
    }
    this.updateSize = () => refreshCanvas();
    this.render = () => {
        if(!enabled) {
            return;
        }

        offscreenBufferContext.drawImage(
            canvas,0,0,width,height,0,0,width,height
        );

        gradeOffscreenCanvas(red);
        context.save();
        context.globalCompositeOperation = "source-over";
        context.drawImage(
            offscreenCanvas,0,0,width,height,
            redOffsets.x,redOffsets.y,width,height
        );
        context.globalCompositeOperation = "screen";

        gradeOffscreenCanvas(green);
        context.drawImage(
            offscreenCanvas,0,0,width,height,
            greenOffsets.x,greenOffsets.y,width,height
        );

        gradeOffscreenCanvas(blue);
        context.drawImage(
            offscreenCanvas,0,0,width,height,
            blueOffsets.x,blueOffsets.y,width,height
        );

        context.restore();
    }
}
export default ChromaticAberration;
