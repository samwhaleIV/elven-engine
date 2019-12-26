const InstallSeededRandom = (function InstallationWrapper({autoInstall=false}){

    const ALREADY_INSTALLED = "Cannot install seeded random. Seeded random is already installed into 'Math' object";
    const BAD_SEED = value => `Value (${value}) could not be parsed into type 'number'`;

    const max = Math.pow(2,53) - 1;
    const magic = Math.pow(2,31) - 1;

    const DEFUALT_SEED_METHOD = function seedGenerator(seed) {
        seed = seed + max;
        seed = ((seed * max / magic) % max + seed) % max - max;
        return Math.round(Math.lerp(-max,max,-seed/max));
    };

    const SEED_TEST = function(method,startSeed=0,testSize=10000) {
        let values = new Array(testSize);
        let seed = startSeed;
        for(let i = 0;i<testSize;i++) {
            seed = method.call(null,seed);
            values[i] = seed;
        }
        return values;
    };

    let installed = false;

    function SafeRandomInstaller(seedMethod) {
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
            let seed = 0;
            const updateSeedValue = value => {
                seed = value;
            };

            const seedGenerator = seedMethod;
            const seedRandom = () => {
                const result = seedGenerator.call(null,seed);
                updateSeedValue(result);
                return floatify(result);
            };

            const applyPureRandom = () => {
                randomMethod = pureRandom;
            };
            const applySeededRandom = () => {
                randomMethod = seedRandom;
            };
            const getRandom = () => {
                return randomMethod.call();
            };

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
                seedTest: {
                    value: function(count) {
                        console.warn("Seed testing is not for production uses!");
                        const results = SEED_TEST(seedGenerator,unfloatify(pureRandom()),count);
                        const values = results.map(floatify);
                        let largestIndex = null;
                        let smallestIndex = null;
                        console.log({
                            largest: values.reduce((oldValue,newValue,index)=>{
                                if(newValue > oldValue) {
                                    largestIndex = index;
                                    return newValue;
                                } else {
                                    return oldValue;
                                }
                            }),
                            smallest: values.reduce((oldValue,newValue,index)=>{
                                if(newValue < oldValue) {
                                    smallestIndex = index;
                                    return newValue;
                                } else {
                                    return oldValue;
                                }
                            }),
                            average: values.reduce((oldValue,newValue)=>{
                                return oldValue + newValue;
                            }) / values.length,
                            values: values,
                            largestSeed: largestIndex,
                            smallestIndex, smallestIndex,
                            results: results
                        });
                    },
                    writable: false
                },
                generateSeed: {
                    value: function updateSeedWithPure() {
                        updateSeedValue(unfloatify(pureRandom.call()));
                        return seed;
                    },
                    writable: false
                },
                getSeeded: {
                    value: seedGenerator,
                    writable: false
                },
                getPure: {
                    value: pureRandom,
                    writable: false
                },
                purify: {
                    value: applyPureRandom,
                    writable: false
                },
                seedify: {
                    value: applySeededRandom,
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

    if(autoInstall) {
        SafeRandomInstaller();
    }

    return SafeRandomInstaller;
})({autoInstall: ENV_FLAGS.INSTALL_SEEDED_RANDOM ? true : false});
