const BitmapList = [
    {
        name: "A",
        width: 6
    },
    {
        name: "B",
        width: 6
    },
    {
        name: "C",
        width: 6
    },
    {
        name: "D",
        width: 6
    },
    {
        name: "E",
        width: 6
    },
    {
        name: "F",
        width: 6
    },
    {
        name: "G",
        width: 7
    },
    {
        name: "H",
        width: 7
    },
    {
        name: "I",
        width: 4
    },
    {
        name: "J",
        width: 6
    },
    {
        name: "K",
        width: 6
    },
    {
        name: "L",
        width: 5
    },
    {
        name: "M",
        width: 10
    },
    {
        name: "N",
        width: 10
    },
    {
        name: "O",
        width: 8
    },
    {
        name: "P",
        width: 6
    },
    {
        name: "Q",
        width: 9
    },
    {
        name: "R",
        width: 7
    },
    {
        name: "S",
        width: 7
    },
    {
        name: "T",
        width: 6
    },
    {
        name: "U",
        width: 7
    },
    {
        name: "V",
        width: 10
    },
    {
        name: "W",
        width: 15
    },
    {
        name: "X",
        width: 9
    },
    {
        name: "Y",
        width: 6
    },
    {
        name: "Z",
        width: 8
    },


    {
        name: "a",
        width: 7
    },
    {
        name: "b",
        width: 6
    },
    {
        name: "c",
        width: 5
    },
    {
        name: "d",
        width: 6
    },
    {
        name: "e",
        width: 6
    },
    {
        name: "f",
        width: 5
    },
    {
        name: "g",
        width: 6
    },
    {
        name: "h",
        width: 6
    },
    {
        name: "i",
        width: 2
    },
    {
        name: "j",
        width: 5
    },
    {
        name: "k",
        width: 6
    },
    {
        name: "l",
        width: 2
    },
    {
        name: "m",
        width: 10
    },
    {
        name: "n",
        width: 6
    },
    {
        name: "o",
        width: 6
    },
    {
        name: "p",
        width: 6
    },
    {
        name: "q",
        width: 8
    },
    {
        name: "r",
        width: 5
    },
    {
        name: "s",
        width: 6
    },
    {
        name: "t",
        width: 6
    },
    {
        name: "u",
        width: 6
    },
    {
        name: "v",
        width: 6
    },
    {
        name: "w",
        width: 10
    },
    {
        name: "x",
        width: 6
    },
    {
        name: "y",
        width: 6
    },
    {
        name: "z",
        width: 6
    },

    {
        name: "0",
        width: 6
    },
    {
        name: "1",
        width: 6
    },
    {
        name: "2",
        width: 6
    },
    {
        name: "3",
        width: 6
    },
    {
        name: "4",
        width: 6
    },
    {
        name: "5",
        width: 6
    },
    {
        name: "6",
        width: 6
    },
    {
        name: "7",
        width: 6
    },
    {
        name: "8",
        width: 6
    },
    {
        name: "9",
        width: 6
    },
    {
        name: ".",
        width: 2
    },
    {
        name: ",",
        width: 2
    },
    {
        name: "\"",
        width: 2
    },
    {
        name: "'",
        width: 2
    },
    {
        name: "?",
        width: 6
    },
    {
        name: "!",
        width: 2
    },
    {
        name: "_",
        width: 5
    },
    {
        name: "*",
        width: 6
    },
    {
        name: "#",
        width: 10
    },
    {
        name: "(",
        width: 4
    },
    {
        name: ")",
        width: 4
    },
    {
        name: "+",
        width: 6
    },
    {
        name: "-",
        width: 6
    },
    {
        name: "/",
        width: 5
    },
    {
        name: "\\",
        width: 5
    },
    {
        name: ":",
        width: 2
    },
    {
        name: ";",
        width: 2
    },
    {
        //A beachigator was here :V
        name: "<",
        width: 5
    },
    {
        name: ">",
        width: 5
    },
    {
        name: "=",
        width: 6
    },
    {
        name: "[",
        width: 4
    },
    {
        name: "]",
        width: 4
    },
    {
        name: ellipsis,
        width: 8
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
