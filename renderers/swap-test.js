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
    const randomPalette = (size=colorCount) => {
        const array = new Array(size);
        for(let i = 0;i<size;i++) {
            array[i] = colors.getRandom();
        }
        return array;
    }
    const palettes = [];
    for(let i = 0;i<20;i++) {
        palettes.push(randomPalette());
    }
    (async ()=>{
        while(true) {
            image = paletteSwap.getSwapped(palettes.getRandom());
            await delay(150);
        }
    })();
    this.render = () => {
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
