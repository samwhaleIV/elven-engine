const BitmapList = [
    {
        name: "A",
        width: 4
    },
    {
        name: "B",
        width: 4
    },
    {
        name: "C",
        width: 4
    },
    {
        name: "D",
        width: 4
    },
    {
        name: "E",
        width: 4
    },
    {
        name: "F",
        width: 4
    },
    {
        name: "G",
        width: 4
    },
    {
        name: "H",
        width: 4
    },
    {
        name: "I",
        width: 3
    },
    {
        name: "J",
        width: 4
    },
    {
        name: "K",
        width: 4
    },
    {
        name: "L",
        width: 3
    },
    {
        name: "M",
        width: 7
    },
    {
        name: "N",
        width: 4
    },
    {
        name: "O",
        width: 4
    },
    {
        name: "P",
        width: 4
    },
    {
        name: "Q",
        width: 5
    },
    {
        name: "R",
        width: 4
    },
    {
        name: "S",
        width: 4
    },
    {
        name: "T",
        width: 3
    },
    {
        name: "U",
        width: 4
    },
    {
        name: "V",
        width: 4
    },
    {
        name: "W",
        width: 7
    },
    {
        name: "X",
        width: 5
    },
    {
        name: "Y",
        width: 3
    },
    {
        name: "Z",
        width: 4
    },


    {
        name: "a",
        width: 3
    },
    {
        name: "b",
        width: 3
    },
    {
        name: "c",
        width: 3
    },
    {
        name: "d",
        width: 3
    },
    {
        name: "e",
        width: 3
    },
    {
        name: "f",
        width: 3
    },
    {
        name: "g",
        width: 3
    },
    {
        name: "h",
        width: 3
    },
    {
        name: "i",
        width: 1
    },
    {
        name: "j",
        width: 2
    },
    {
        name: "k",
        width: 4
    },
    {
        name: "l",
        width: 1
    },
    {
        name: "m",
        width: 5
    },
    {
        name: "n",
        width: 3
    },
    {
        name: "o",
        width: 3
    },
    {
        name: "p",
        width: 3
    },
    {
        name: "q",
        width: 4
    },
    {
        name: "r",
        width: 2
    },
    {
        name: "s",
        width: 3
    },
    {
        name: "t",
        width: 3
    },
    {
        name: "u",
        width: 3
    },
    {
        name: "v",
        width: 3
    },
    {
        name: "w",
        width: 5
    },
    {
        name: "x",
        width: 3
    },
    {
        name: "y",
        width: 3
    },
    {
        name: "z",
        width: 3
    },

    {
        name: "0",
        width: 3
    },
    {
        name: "1",
        width: 3
    },
    {
        name: "2",
        width: 3
    },
    {
        name: "3",
        width: 3
    },
    {
        name: "4",
        width: 3
    },
    {
        name: "5",
        width: 3
    },
    {
        name: "6",
        width: 3
    },
    {
        name: "7",
        width: 3
    },
    {
        name: "8",
        width: 3
    },
    {
        name: "9",
        width: 3
    },
    {
        name: ".",
        width: 1
    },
    {
        name: ",",
        width: 1
    },
    {
        name: "\"",
        width: 1
    },
    {
        name: "'",
        width: 1
    },
    {
        name: "?",
        width: 3
    },
    {
        name: "!",
        width: 1
    },
    {
        name: "_",
        width: 4
    },
    {
        name: "*",
        width: 3
    },
    {
        name: "#",
        width: 5
    },
    {
        name: "(",
        width: 2
    },
    {
        name: ")",
        width: 2
    },
    {
        name: "+",
        width: 3
    },
    {
        name: "-",
        width: 3
    },
    {
        name: "/",
        width: 3
    },
    {
        name: "\\",
        width: 3
    },
    {
        name: ":",
        width: 1
    },
    {
        name: ";",
        width: 1
    },
    {
        //A beachigator was here :V
        name: "<",
        width: 3
    },
    {
        name: ">",
        width: 3
    },
    {
        name: "=",
        width: 3
    },
    {
        name: "[",
        width: 2
    },
    {
        name: "]",
        width: 2
    },
    {
        name: ellipsis,
        width: 5
    }
];
const BitmapManifest = {};
(function(){
    let x = 0;
    BitmapList.forEach((glyph,index) => {
        glyph.x = x;
        glyph.index = index;
        x += glyph.width + 1;
        BitmapManifest[glyph.name] = glyph;
    });
})();
