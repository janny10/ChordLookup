// Left Todo:
// Testing obvi.
// Let's get some stuff showing up.
// So we want a lookup mode in the front end
// And we want a submit comma separated version
// Front end should display:
//   1. input, so chord name
//   2. what it was interpreted as
//   3. scale degrees
//   4. chord values
//   5. the scale ie. allowable notes in solo

// [c, d, e, f, g, a, b]
// [c, d, e, f, g, a, b, c, d, e, f, g, a, b]
// [0, 6, 5, 4, 3, 2, 1]
// [0, 1, 2, 3, 4, 5, 6]
// [1, 2, 3, 4, 5, 6, 7]
// scales are represented as whole/half step sequences
const MAJOR = [1, 1, 0.5, 1, 1, 1, 0.5]
const MINOR = [1, 0.5, 1, 1, 1, 1, 0.5]

const NOTES = ['c', 'd', 'e', 'f', 'g', 'a', 'b']
//const NOTES_WITH_SHARPS = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b']
//const NOTES_WITH_FLATS = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b']

const VOICINGS = {
    // ionian, dorian, and mixolydian
    'maj7':[[3, 5, 7, 9], [7, 9, 3, 5]], // avoid or raise 4 typically
    // key ionian
    'min7':[[3, 5, 7, 9], [7, 9, 3, 5]],
    // key - 1 ionian or key dorian
    'dom7':[[3, 13, 7, 9], [7, 9, 3, 13]], // avoid or raise 4 typically
    // key - 4 ionian or key mixolydian
    
    // Yes ok I represent flats as negative and sharps as +0.5
    // Yes I could represent all accidentals as +/-0.5 but -5
    // captures 'flat 5' more intuitively. Keeping the 5 indicates
    // we are lowering the 5 rather than raising 4.
    // NOTE: scale degrees are signed relative to dorian but actually
    // this is locrian and we should consider generating
    // locrian scale and using 'unsigned' scale degrees
    'min7b5':[[3, -5, 7, 9], [7, 9, 3, -5],
            [1, 11, -5, 7], [-5, 7, 9, 11], [11, -5, 7, 9]], // avoid b9
    // key + 1 ionian or key locrian

    // NOTE: signed relative to mixolydian. consider generating
    // altered scale and using 'unsigned' scale degrees
    // ie. minor scale 7 mode
    'dom7alt':[[3, -13, 7, 9.5], [7, 9.5, 3, -13]],
    // key + 1 majmin or key alt

    // dom7b5 can have 3rdless or 3rdful voicings
    // ie. minor scale 6 mode
    'dom7b5':[[-5, 13, 7, 9], [7, 9, -5, 13],
        [3, -5, 13, 7], [7, 3, -5, 13]],
    // key + 2 majmin

    // dom7#9 usually have 5 and no 13
    // prefer 3 in root, not 7
    'dom7#9':[[3, 5, 7, 9.5], [7, 9.5, 3, 5]],
    // key mixolydian, raise the 13 of corresponding ionian
    
    // minor scale 1 mode
    'majmin':[[-3, 5, 7, 9], [7, 9, -3, 5]],

    // sus chords (mixolydian)
    'dom7sus':[[1, 4, 7], [7, 9, 4, 13], [4, 13, 7, 9]],

    // phrygian
    // degrees relative to dorian
    'phryg':[[1, -9, 4, 5]],
}

const isValidNote = function(note) {
    if (typeof note !== 'string') return false;
    if (note.length > 2 || note.length < 1) return false;
    if (!NOTES.includes(note[0])) return false;
    if (note.length == 2 && (note[1] !== '#' && note[1] !== 'b')) return false;
    return true;
}

// spell sharp by default
const incHalfStep = function(note, spellFlat = false) {
    if (!isValidNote(note)) return null;

    // special case e and b
    if (note == 'e') return 'f';
    if (note == 'b') return 'c';

    let accidental = 0;
    if (note.length == 2) {
        accidental = note[1] == '#' ? 1 : -1;
    }

    let newNote = note[0];
    if (accidental > 0 || (accidental == 0 && spellFlat)) {
        // A bit obscure, but here is the logic:
        // For most cases, if note is sharp or we're spelling flat,
        // we should increment the note and decrement the sign.
        // eg. If G# -> A or C (spellFlat) -> Db
        // in first case, sign goes from 1 to 0, in second, sign goes from
        // 0 to -1.
        // Exceptions are e#, b# normal case and e, and b, spellflat.
        // In these cases the sign should not change.
        if (note[0] !== 'e' && note[0] !== 'b') {
            accidental -= 1;
        }
        
        let index = NOTES.indexOf(note[0]);
        newNote = NOTES[(index + 1) % NOTES.length];
    } else {
        // in the case that the accidental is flat or
        // natural, we don't need to change the actual note,
        // we just need to increment the accidental
        accidental += 1
    }
    return accidental != 0 ? 
            accidental > 0 ? newNote + '#' : newNote + 'b' :
            newNote;
}

// spell flat by default
const decHalfStep = function(note, spellSharp = false) {
    if (!isValidNote(note)) return null;

    // special case c and f
    if (note == 'f') return 'e';
    if (note == 'c') return 'b';

    let accidental = 0;
    if (note.length == 2) {
        accidental = note[1] == '#' ? 1 : -1;
    }
    let newNote = note[0];

    if (accidental < 0 || (accidental == 0 && spellSharp)) {
        // logic here is the same as that in incHalfStep but in reverse
        if (note[0] !== 'c' && note[0] !== 'f') {
            accidental += 1;
        }
        let index = NOTES.indexOf(note[0]);
        if (index - 1 < 0) index += NOTES.length;
        newNote = NOTES[index - 1];
    } else {
        // in the case that the accidental is sharp or
        // natural, we don't need to change the actual note,
        // we just need to decrement the accidental
        accidental -= 1
    }
    return accidental != 0 ? 
            accidental > 0 ? newNote + '#' : newNote + 'b' :
            newNote;
}

// mode is 1 for ionian 2 for dorian etc.
// major is true for major, false is minor
const generateScaleVals = function(key, mode = 1, major = true) {
    if (!isValidNote(key) || typeof major !== 'boolean') return null;

    const scale = major ? MAJOR : MINOR;

    // TODO: should I leave it as halfstep incs or switch to counting through the notes arrays?
    // const accidental = key[1];
    // const notes = accidental == 0 ? (major ? NOTES_WITH_SHARPS : NOTES_WITH_FLATS) :
    //         (accidental > 0 ? NOTES_WITH_SHARPS : NOTES_WITH_FLATS);
    // let currNote = accidental == 0 ? key : (accidental > 0 ? key+'#' : key+'b')

    let currNote = key;
    let scaleVals = [currNote];
    for (let i = 0; i < scale.length - 1; i++) {
        let interval = scale[(i + mode - 1) % scale.length];
        console.log('interval: ', interval);
        while (interval > 0) {
            currNote = incHalfStep(currNote, mode == 5);
            interval -= 0.5;
        }
        scaleVals.push(currNote);
    }
    return scaleVals;
}

// Takes a string and parses it into an array consisting of valid altered
// scale values
const altParser = function(alts) {
    const validAlts = ['b9', 'b5', 'b13', '#9', '#11', '#5', '#13', '9',
                        '11', '13'];
    const parsedAlts = [];
    while (alts.length > 0) {
        let matched = false;
        for (const validAlt of validAlts) {
            if (alts.startsWith(validAlt)) {
                if (!parsedAlts.includes(validAlt)) {
                    parsedAlts.push(validAlt);
                }
                alts = alts.slice(validAlt.length);
                matched = true;
                break;
            }
        }
        if (!matched) {
            return null;
        }
    }

    // Constraint: 11 and 5 cannot appear together
    if ((parsedAlts.includes('11') || parsedAlts.includes('#11')) &&
        parsedAlts.includes('b5')) {
        return null;
    }

    return parsedAlts;
}

const convertAlts = function(alts) {
    let convertedAlts = []
    for (const alt of alts) {
        if (alt[0] == 'b') {
            convertedAlts.push(-1 * parseInt(alt.slice(1)));
        } else if (alt[0] == '#') {
            const degree = parseInt(alt.slice(1));
            if (degree == 11) {
                // special case #11 to b5
                convertedAlts.push(-5);
            } else if (degree == 5) {
                // special case #5 to b13
                convertedAlts.push(-13);   
            }else {
                convertedAlts.push(degree + 0.5);
            }
        } else {
            convertedAlts.push(parseInt(alt));
        }
    }
    return convertedAlts;
}

// parses out the mode. returns the mode and the rest of the string to parse
const modeParser = function(modeWithAlts) {
    //const validModes = ['maj7', 'majMin', 'min7', 'min7b5', 'dom7',
    //        'dom7alt', 'dom7b5', 'dom7#9', 'dom7sus', 'phryg'];
    // NOTE: Order matters here because we are testing 'startsWith.'
    // eg. If 'dom' was first, and the mode was 'dom7alt', then the switch
    // statement would not produce the correct return value.
    const validModes = ['maj7', 'majmin', 'maj', '-7', 'min7', 'min', 'dom7',
            'dom', 'dom7alt', '7', 'alt', 'sus', 'dom7sus', 'phrygian',
            'phryg']
    for (const validMode of validModes) {
        if (modeWithAlts.startsWith(validMode)) {
            let alts = modeWithAlts.slice(validMode.length);
            let mode = validMode;
            switch (mode) {
                case '-7':
                    mode = 'min7';
                    break;
                case '7':
                    mode = 'dom' + validMode;
                    break;
                case 'dom':
                case 'maj':
                case 'min':
                    mode = validMode + '7'
                    break;
                case 'alt':
                case 'sus':
                    mode = 'dom7' + validMode;
                    break;
                case 'phrygian':
                    mode = 'phryg';
                    break;
            }
            return [mode, alts];
        }
    }
    return null;
}

// get the key out of a chord name
const keyParser = function(chordName) {
    let key = chordName[0];
    if (!NOTES.includes(key)) return null;
    let parseIndex = 1
    if (chordName[1] == '#' || chordName[1] == 'b') {
        parseIndex += 1;
        key += chordName[1];
    }
    return [key, chordName.slice(parseIndex)];
}

// TODO: handle minor scale modes
const generateChordInfo = function(chordName, major = true) {
    chordName = chordName.toLowerCase();
    const keyAndModeAlts = keyParser(chordName);
    if (keyAndModeAlts == null) return null;
    const key = keyAndModeAlts[0];
    const modeAndAlts = modeParser(keyAndModeAlts[1]);
    if (modeAndAlts == null) return null;
    const mode = modeAndAlts[0];
    const alts = altParser(modeAndAlts[1]);
    if (alts == null) return null;

    //const validModes = ['maj7', 'majmin', 'min7', 'min7b5', 'dom7',
    //        'dom7alt', 'dom7b5', 'dom7#9', 'dom7sus', 'phryg'];
    if (alts.includes('b5')) {
        if (mode == 'dom7' || mode == 'min7') {
            mode += 'b5';
            alts.index = alts.indexOf('b5');
            alts.splice(index, index);
        }
    }

    if (alts.includes('#9')) {
        if (mode != 'dom7') return null;
        mode += '#9';
        alts.index = alts.indexOf('#9');
        alts.splice(index, index);
    }

    // no alts on altered chords
    if (alts.length > 0 && mode == 'dom7alt') return null;

    // commented out was mutating VOICINGS. It is better to deep copy.
    // wth javascript. I'm def still learning.
    //const voicingScaleDegrees = VOICINGS[mode];
    const voicingScaleDegrees = VOICINGS[mode].map(voicing => [...voicing]);

    
    // TODO: maybe abstract into method
    for (const alt of alts) {
        // we ignore if it's just 9 or 13. those are already in the rootless
        // voicing.

        // const validAlts = ['b9', 'b5', 'b13', '#9', '#11', '#5', '#13', '9',
        //                  '11', '13'];
        // b5, #11, #9 should already be handled except maj7b5 (lydian)

        for (const voicing of voicingScaleDegrees) {
            // if 11, try replacing 3. this is sus-y.
            if (alt == '11') {
                let index = voicing.indexOf(3);
                voicing[index] = 4;
            }
            if (alt == 'b5') {
                let index = voicing.indexOf(3);
                voicing[index] = -5;
            }
            if (alt == 'b9') {
                let index = voicing.indexOf(9);
                voicing[index] *= -1;
            }
            if (alt == 'b13') {
                let index = voicing.indexOf(13);
                voicing[index] *= -1;
            }
            if (alt == '#13') {
                let index = voicing.indexOf(13);
                voicing[index] += 0.5;
            }
        }
    }

    let modeNum = 5; // most likely dom/mixolydian
    if (mode == 'min7' || mode == 'min7b5' ||
        mode == 'phryg') {
        modeNum = 2; // dorian
    } else if (mode == 'maj7') {
        modeNum = 1; // ionian
    }
    // TODO: This can probably be const if we make this logic
    // and the below more harmonious. We should really only
    // generate scale once.
    let scale = generateScaleVals(key, modeNum);
    console.log(scale);
    if (scale == null) return null;

    let voicings = [];

    for (const voicing of voicingScaleDegrees) {
        voicings.push(voicing.reverse())
        let scaleVals = [];
        for (let scaleDegree of voicing) {
            let accidental = 0;
            // check for negative
            if (scaleDegree < 0) {
                accidental = -1;
                scaleDegree *= -1;
            }
            // check for appended 0.5
            if (scaleDegree % 1 != 0) {
                accidental = 1;
                scaleDegree -= 0.5;
            }

            if (scaleDegree > scale.length) {
                scaleDegree -= scale.length;
            }
            let newNote = scale[scaleDegree - 1];
            if (accidental > 0) newNote = incHalfStep(newNote);
            if (accidental < 0) newNote = decHalfStep(newNote);
            scaleVals.push(newNote);
        }
        voicings.push(scaleVals.map(val => val.charAt(0).toUpperCase() + val.slice(1)));
    }

    // get the scale of valid notes.
    // TODO: this should probably be smarter.
    // interpreting all #11 as b5 prob not best.
    // There are majmin flavor and major flavor dim chords.
    // TODO: phrygian is not well supported
    // TODO: altered notes logic is not good.
    // TODO: make this logic harmonious w logic above    
    let basicMode = null
    let majorMode = true
    let altKey = key
    let needsNewScale = false
    const modeSlice = mode.slice(4);
    if (mode.startsWith('dom7')) {
        if (modeSlice == 'alt') {
            basicMode = 'alt'
            majorMode = false
            needsNewScale = true
            modeNum = 7
        } else if (modeSlice == 'b5') {
            basicMode = 'halfDim'
            modeNum = 6
            needsNewScale = true
        } else {
            basicMode = 'mixolydian'
        }
    } else if (mode.startsWith('min7')) {
        if (modeSlice == 'b5') {
            modeNum = 7
            needsNewScale = true
        }
        basicMode = 'dorian'
    } else if (mode.startsWith('maj7')) {
        basicMode = 'ionian'
    } else if (mode == 'majmin') {
        basicMode = 'major-minor'
        majorMode = false
        modeNum = 1
        needsNewScale = true
    }

    if (needsNewScale) {
        scale = generateScaleVals(key, modeNum, majorMode);
    }
    if (modeNum > 1) {
        // TODO: I think there is a better formula for this than
        // special casing modeNum == 1
        altKey = scale[MAJOR.length - (modeNum - 1)]
    }

    // TODO: this should be done better/earlier. But final formatting
    // lives here for now.
    // TODO: just cuz key is const. would be better to keep key const,
    // but making it let would be a fine fix I guess.
    let hackKey = key.charAt(0).toUpperCase() + key.slice(1);
    altKey = altKey.charAt(0).toUpperCase() + altKey.slice(1);
    scale = scale.map(note => note.charAt(0).toUpperCase() + note.slice(1));
    let majorOrMinorStr = majorMode ? 'major' : 'minor'
    // input, interp_key, voicings, scaleName, scale
    let info = {
        'input': chordName,
        'interp_key': hackKey+' '+mode,
        'voicings': voicings,
        'scaleName': hackKey+' '+basicMode,
        'altScaleName': altKey+' '+majorOrMinorStr,
        'scale': scale
    }

    return info;
}

//let test = generateChordInfo('amaj');
//console.log(test);

////////// Mostly generated code below
let infoBoxCounter = 0;

const input = document.getElementById('textInput');
const submitBtn = document.getElementById('submitButton');
//const realTimeCheckbox = document.getElementById('realTimeCheckbox');
const container = document.getElementById('info-container');

input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault(); // Prevent form submission if inside a form
        submitButton.click();   // Trigger the submit button click
    }
});

submitBtn.addEventListener('click', () => {
    const info = generateChordInfo(input.value);
    container.appendChild(createInfoBox(info));
});

// realTimeCheckbox.addEventListener('change', () => {
//     if (realTimeCheckbox.checked) {
//     input.addEventListener('input', realTimeListener);
//     } else {
//     input.removeEventListener('input', realTimeListener);
//     }
// });

// function realTimeListener() {
//     //foo(input.value);
// }

function createInfoBox(info) {
    const box = document.createElement('div');
    box.className = 'info-box';
    //box.setAttribute('draggable', 'true');
    infoBoxCounter++;

    // Add inner HTML
    box.innerHTML = `
        <button class="delete-btn" title="Delete">&#10006;</button>
        <div><span class="label">Input:</span> ${info.input}</div>
        <div><span class="label">Interpreted Chord:</span> ${info.interp_key}</div>
        <div><span class="label">Scale Name:</span> ${info.scaleName}</div>
        <div><span class="label">Alt Scale Name:</span> ${info.altScaleName}</div>

        <div class="label">Voicings:</div>
        <div class="voicings">
            ${info.voicings.map((voicing, index) => `
            <div class="voicing-column${index % 2 === 1 ? ' alt-bg' : ' fit-bg'}">
                ${voicing.map(note => `<div>${note}</div>`).join('')}
            </div>
            `).join('')}
        </div>


        <div class="label">Scale:</div>
        <div class="scale-row">
            ${info.scale.map(note => `<div class="scale-note">${note}</div>`).join('')}
        </div>

        <div class="info-seq-number">${infoBoxCounter}</div>
    `;

    // Delete button event
    box.querySelector('.delete-btn').addEventListener('click', () => {
        box.remove();
    });

//     // // Drag & drop handlers
//     // box.addEventListener('dragstart', () => {
//     //     box.classList.add('dragging');
//     // });

//     // box.addEventListener('dragend', () => {
//     //     box.classList.remove('dragging');
//     // });

    return box;
}

// container.addEventListener('dragover', (e) => {
//     e.preventDefault();
//     const dragging = document.querySelector('.dragging');
//     const afterElement = getDragAfterElement(container, e.clientY);
//     if (afterElement == null) {
//         container.appendChild(dragging);
//     } else {
//         container.insertBefore(dragging, afterElement);
//     }
// });

// function getDragAfterElement(container, y) {
//     const draggableElements = [...container.querySelectorAll('.info-box:not(.dragging)')];
//     return draggableElements.reduce((closest, child) => {
//         const box = child.getBoundingClientRect();
//         const offset = y - box.top - box.height / 2;
//         if (offset < 0 && offset > closest.offset) {
//             return { offset: offset, element: child };
//         } else {
//             return closest;
//         }
//     }, { offset: Number.NEGATIVE_INFINITY }).element;
// }

document.getElementById('clear-btn').addEventListener('click', () => {
    const container = document.getElementById('info-container');
    container.innerHTML = ''; // Clear all child elements
    infoBoxCounter = 0;
});
////////////////

// This is mine.
// altered notes for keys
// This is unused but might be useful.
// const keys = {
//     'c':[],
//     'g':['f'],
//     'd':['f', 'c'],
//     'a':['f', 'c', 'g'],
//     'e':['f', 'c', 'g', 'd'],
//     'b':['f', 'c', 'g', 'd', 'a'],
//     'f#':['f', 'c', 'g', 'd', 'a', 'e'],
//     'c#':['f', 'c', 'g', 'd', 'a', 'e', 'b'],
//     // omitting g#, d# and a# bc they are dumb and unnecessary for jazz
//     // 'g#':[],
//     // 'd#':[],
//     // 'a#':[],
//     'f':['b'],
//     'bb':['b', 'e'],
//     'eb':['b', 'e', 'a'],
//     'ab':['b', 'e', 'a', 'd'],
//     'db':['b', 'e', 'a', 'd', 'g'],
//     'gb':['b', 'e', 'a', 'd', 'g', 'c'],
// }

// major scale modes
// ionian, dorian, phrygian, lydian, mixolydian, aeolian, locrian
// Cmaj7, Dmin7, Ephryg (Esusb9) F/E, Fmaj7#11, G7, VI, B-7b5 
// TODO: avoid notes on all modes.

// minor scale modes
// minor-major, Dsusb9, Lydian augmented, Lydian dominant, V,
// half-diminished or Locrian #2, altered or diminished-whole tone
// C-maj7, Dsusb9, Ebmaj7+5, F7+11, G7, A-7b5, B7alt

