import PaletteSwap from "./components/palette-swap.js";

function SwapTestRenderer() {
    const paletteSwap = new PaletteSwap(
        imageDictionary["swap-test"]
    );

    const colorCount = 4;
    let image = null;

    const colors = [
        "red","orange","blue","green","yellow","magenta","purple","pink"
    ];
    const randomColor = () => colors[Math.floor(Math.random()*colors.length)];
    const randomPalette = (size=colorCount) => {
        const array = new Array(size);
        for(let i = 0;i<size;i++) {
            array[i] = randomColor();
        }
        return array;
    }
    const palettes = [];
    for(let i = 0;i<20;i++) {
        palettes.push(randomPalette());
    }
    const randomSavedPalette = () => palettes[Math.floor(Math.random()*palettes.length)];
    (async ()=>{
        while(true) {
            image = paletteSwap.getSwapped(
                randomSavedPalette()
            );
            await delay(150);
        }
    })();
    this.render = () => {
        context.fillStyle = "black";
        context.fillRect(0,0,fullWidth,fullHeight);
        if(image === null) {
            return;
        }
        const size = 512;
        const halfSize = size / 2;
        context.drawImage(
            image,0,0,image.width,image.height,
            halfWidth-halfSize,halfHeight-halfSize,size,size
        );
    }
}
export default SwapTestRenderer;
