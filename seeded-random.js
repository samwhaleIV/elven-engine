const InstallSeededRandom = (function InstallationWrapper(){

    const ALREADY_INSTALLED = "Cannot install seeded random. Seeded random is already installed into 'Math' object";
    const BAD_SEED = value => `Value (${value}) could not be parsed into type 'number'`;

    const DEFUALT_SEED_METHOD = function seedGenerator(seed) {
        //Todo
        return seed;
    };

    let installed = false;

    return function SafeRandomInstaller(seedMethod) {
        if(installed) {
            throw Error(ALREADY_INSTALLED);
        }
        installed = true;

        if(seedMethod === undefined) {
            seedMethod = DEFUALT_SEED_METHOD;
        }

        const max = Number.MAX_SAFE_INTEGER;
        const floatify = integer => (integer / max + 1) / 2;
        const unfloatify = float => float * max * 2 - max;

        Math.random = (function SeededRandomScope(){
            const pureRandom = Math.random;

            let randomMethod = pureRandom;
            let seed = unfloatify(pureRandom.call());
            const updateSeedValue = value => seed = value;

            const seedGenerator = seedMethod;
            const seedRandom = () => {
                const result = seedGenerator.call(null,seed);
                updateSeedValue(result);
                return floatify(result);
            };

            const applyPureRandom = () => randomMethod = applyPureRandom;
            const applySeededRandom = () => randomMethod = seedRandom;
            const getRandom = () => randomMethod.call();

            return Object.defineProperties(function randomMethodRouter(){
                return getRandom();
            },{
                mode: {
                    get: function() {
                        if(randomMethod === pureRandom) {
                            return "pure";
                        } else {
                            return "seed";
                        }
                    }
                },
                purify: {
                    value: function purify() {
                        applyPureRandom();
                    },
                    writable: false
                },
                seedify: {
                    value: function seedify() {
                        applySeededRandom();
                    },
                    writable: false
                },
                seed: {
                    get: function getSeed() {
                        return seed;
                    },
                    set: function setSeed(value) {
                        const parsedValue = Number(value);
                        if(isNaN(parsedValue)) {
                            throw TypeError(BAD_SEED(value));
                        }
                        updateSeedValue(parsedValue);
                    }
                }
            });
        })();
    }
})();
