const POST_PROCESS_WORKER_PATH = "../elven-engine/renderers/components/post-process-worker.js";
function PostProcessor(resolutionScale) {
    const postProcessWorker = new Worker(POST_PROCESS_WORKER_PATH);
    let postProcessBusy = true;
    let postProcessBuffer = null;
    let postProcessBefore = true;
    let postProcessTransportCanvas = null;
    let postProcessTransportContext = null;
    postProcessWorker.onmessage = event => {
        const data = event.data;
        if(data.updateSettings) {
            if(data.settings.postProcessBefore) {
                postProcessBefore = true;
            } else {
                postProcessBefore = false;
            }
        } else if(data.busy) {
            postProcessBusy = true;
        } else if(data.ready) {
            postProcessBusy = false;
        } else {
            postProcessTransportContext.putImageData(data.imageData,0,0);
            if(postProcessBuffer) {
                postProcessBuffer.close();
            }
            postProcessBuffer = postProcessTransportCanvas.transferToImageBitmap();
        }
    }
    const renderPostProcessBuffer = () => {
        if(postProcessBuffer && postProcessBuffer.width && postProcessBuffer.height) {
            context.drawImage(
                postProcessBuffer,
                0,0,postProcessBuffer.width,
                postProcessBuffer.height,
                0,0,fullWidth,fullHeight
            );
        }
    }
    let postProcessingEnabled = false;
    this.set = type => {
        if(termianted) {
            return;
        }
        postProcessWorker.postMessage({
            updateProcessor: true,
            newProcessor: type
        });
    }
    this.enable = () => {
        postProcessingEnabled = true;
    }
    this.disable = () => {
        postProcessingEnabled = false;
    }
    let termianted = false;
    this.terminate = () => {
        postProcessWorker.terminate();
        termianted = true;
    }
    this.render = () => {
        if(termianted) {
            return;
        }
        if(postProcessingEnabled) {
            if(postProcessBefore) {
                renderPostProcessBuffer();
            }
            if(!postProcessBusy) {
                const outputWidth = Math.floor(halfWidth * resolutionScale);
                const outputHeight = Math.floor(halfHeight * resolutionScale);
                postProcessTransportCanvas = new OffscreenCanvas(
                   outputWidth,outputHeight
                );
                postProcessTransportContext = postProcessTransportCanvas.getContext(
                    "2d",{alpha:true}
                );
                postProcessTransportContext.drawImage(
                    canvas,0,0,fullWidth,fullHeight,0,0,
                    postProcessTransportCanvas.width,
                    postProcessTransportCanvas.height
                );
                postProcessWorker.postMessage({
                    width: postProcessTransportCanvas.width,
                    height: postProcessTransportCanvas.height,
                    imageData: postProcessTransportContext.getImageData(
                        0,0,postProcessTransportCanvas.width,postProcessTransportCanvas.height
                    )
                });
            } else {
                postProcessWorker.postMessage({});
            }
            if(!postProcessBefore) {
                renderPostProcessBuffer();
            }
        }
    }
}
