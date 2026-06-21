/* =============================================================
 * data.js — Symbol library + tiered readings (the "brain")
 * -------------------------------------------------------------
 * This file holds ALL domain data for the prototype.
 * No backend, no API: the "AI" output is produced entirely by
 * counting symbols on the canvas and showing a tiered reading.
 * ============================================================= */

/* ---------- 1. Symbol Library -------------------------------
 * Three semiotic layers:
 *   - SHAPE   : abstract form / gestalt (round, sharp, stable...)
 *   - COLOR   : affective filter (intensity, calm, caution...)
 *   - OBJECT  : concrete objects, places & emotions (referents)
 * Each symbol uses a system glyph (emoji / unicode) — no images.
 * ----------------------------------------------------------- */
const SYMBOL_LIBRARY = {
  categories: [
    {
      name: "Shapes",
      hint: "Form & gestalt",
      items: [
        { id: "shape_circle",   label: "Circle",   emoji: "⚪", tags: ["round", "whole", "soft"],         reading: "Soft and round." },
        { id: "shape_triangle", label: "Triangle", emoji: "🔺", tags: ["sharp", "pointed", "alert"],      reading: "Sharp. Pointed." },
        { id: "shape_square",   label: "Square",   emoji: "🟦", tags: ["stable", "block", "fixed"],       reading: "Stable. Solid." },
        { id: "shape_diamond",  label: "Diamond",  emoji: "🔶", tags: ["value", "special", "edge"],       reading: "Special. Precious." },
        { id: "shape_wave",     label: "Wave",     emoji: "〰️", tags: ["flow", "motion", "unsteady"],     reading: "Unsteady. Shifting." },
        { id: "shape_spiral",   label: "Spiral",   emoji: "🌀", tags: ["dizzy", "overwhelm", "loop"],     reading: "Dizzy. Spinning." },
        { id: "shape_burst",    label: "Burst",    emoji: "✴️", tags: ["energy", "intense", "trigger"],   reading: "Sudden. Energy." },
        { id: "shape_down",     label: "Down",     emoji: "🔻", tags: ["down", "low", "fall"],            reading: "Sinking. Low." }
      ]
    },
    {
      name: "Colors",
      hint: "Affective filter",
      items: [
        { id: "color_red",    label: "Red",    emoji: "🔴", tags: ["intense", "danger", "anger"],         reading: "Intense. Anger." },
        { id: "color_orange", label: "Orange", emoji: "🟠", tags: ["warm", "restless", "hungry"],          reading: "Restless. Hungry." },
        { id: "color_yellow", label: "Yellow", emoji: "🟡", tags: ["happy", "caution", "bright"],          reading: "Bright. Cautious." },
        { id: "color_green",  label: "Green",  emoji: "🟢", tags: ["safe", "okay", "go"],                 reading: "Safe. Okay." },
        { id: "color_blue",   label: "Blue",   emoji: "🔵", tags: ["calm", "sad", "peace"],               reading: "Calm. Quiet." },
        { id: "color_purple", label: "Purple", emoji: "🟣", tags: ["tired", "quiet", "dream"],            reading: "Tired. Dreamy." },
        { id: "color_brown",  label: "Brown",  emoji: "🟤", tags: ["earth", "dull", "heavy"],             reading: "Heavy. Dull." },
        { id: "color_black",  label: "Black",  emoji: "⚫", tags: ["dark", "fear", "empty"],              reading: "Empty. Afraid." }
      ]
    },
    {
      name: "Emotions",
      hint: "Feelings",
      items: [
        { id: "emo_happy",    label: "Happy",    emoji: "😊",   tags: ["happy", "good", "content"],       reading: "Smiling. Content." },
        { id: "emo_laugh",    label: "Laugh",    emoji: "😄",   tags: ["joy", "fun", "excited"],          reading: "Joyful. Excited." },
        { id: "emo_love",     label: "Love",     emoji: "❤️",  tags: ["love", "warm", "close"],           reading: "Warm. Close." },
        { id: "emo_calm",     label: "Calm",     emoji: "😌",   tags: ["calm", "relaxed", "okay"],        reading: "Relaxed. Peaceful." },
        { id: "emo_cry",      label: "Crying",   emoji: "😢",   tags: ["sad", "hurt", "fear"],            reading: "Sad. Hurting." },
        { id: "emo_angry",    label: "Angry",    emoji: "😡",   tags: ["mad", "frustrated", "upset"],     reading: "Frustrated. Upset." },
        { id: "emo_scared",   label: "Scared",   emoji: "😨",   tags: ["fear", "worried", "nervous"],     reading: "Worried. Nervous." },
        { id: "emo_tired",    label: "Tired",    emoji: "😴",   tags: ["sleepy", "exhausted", "rest"],    reading: "Exhausted. Sleepy." },
        { id: "emo_sick",     label: "Sick",     emoji: "🤢",   tags: ["unwell", "pain", "nausea"],       reading: "Unwell. Nausea." },
        { id: "emo_confused", label: "Confused", emoji: "😵‍💫", tags: ["confused", "lost", "dizzy"],       reading: "Lost. Confused." },
        { id: "emo_neutral",  label: "Neutral",  emoji: "😐",   tags: ["neutral", "unsure", "flat"],      reading: "Unsure. Flat." },
        { id: "emo_shy",      label: "Shy",      emoji: "😳",   tags: ["shy", "embarrassed", "nervous"], reading: "Shy. Embarrassed." }
      ]
    },
    {
      name: "Food & Drink",
      hint: "Eating & needs",
      items: [
        { id: "obj_water",  label: "Water",    emoji: "💧", tags: ["liquid", "wet", "drink"],             reading: "Thirst. Spilled." },
        { id: "obj_cup",    label: "Cup",      emoji: "☕", tags: ["container", "kitchen", "drink"],      reading: "A warm drink." },
        { id: "obj_food",   label: "Food",     emoji: "🍽️", tags: ["eat", "hungry", "meal"],             reading: "Hungry. Mealtime." },
        { id: "obj_apple",  label: "Apple",    emoji: "🍎", tags: ["fruit", "snack", "eat"],             reading: "Fresh fruit." },
        { id: "obj_bread",  label: "Bread",    emoji: "🍞", tags: ["food", "hungry", "meal"],            reading: "Hungry. Food." },
        { id: "obj_milk",   label: "Milk",     emoji: "🥛", tags: ["drink", "calm", "warm"],             reading: "Warm comfort." },
        { id: "obj_candy",  label: "Candy",    emoji: "🍬", tags: ["sweet", "treat", "want"],            reading: "Sweet treat." },
        { id: "obj_pill",   label: "Medicine", emoji: "💊", tags: ["medicine", "pain", "help"],           reading: "Medicine. Pain." }
      ]
    },
    {
      name: "Places & Objects",
      hint: "Referents & context",
      items: [
        { id: "obj_sofa",     label: "Sofa",     emoji: "🛋️", tags: ["rest", "home", "comfort"],         reading: "Rest. Home." },
        { id: "obj_bed",      label: "Bed",      emoji: "🛏️", tags: ["sleep", "tired", "rest"],          reading: "Sleep. Tired." },
        { id: "obj_door",     label: "Door",     emoji: "🚪", tags: ["exit", "leave", "outside"],        reading: "Exit. Leaving." },
        { id: "obj_toilet",   label: "Toilet",   emoji: "🚽", tags: ["bathroom", "need", "urgent"],      reading: "Bathroom. Urgent." },
        { id: "obj_sun",      label: "Sun",      emoji: "☀️", tags: ["outside", "day", "warm"],           reading: "Outside. Daytime." },
        { id: "obj_home",     label: "Home",     emoji: "🏠", tags: ["home", "safe", "place"],            reading: "Safety. Belonging." },
        { id: "obj_school",   label: "School",   emoji: "🏫", tags: ["school", "work", "place"],         reading: "Routine. Structure." },
        { id: "obj_dog",      label: "Dog",      emoji: "🐕", tags: ["pet", "companion", "love"],        reading: "Pet. Companion." },
        { id: "obj_music",    label: "Music",    emoji: "🎵", tags: ["sound", "loud", "play"],           reading: "Sound. Loud." },
        { id: "obj_phone",    label: "Phone",    emoji: "📱", tags: ["call", "contact", "screen"],       reading: "Calling. Contact." },
        { id: "obj_clock",    label: "Clock",    emoji: "⏰", tags: ["time", "wait", "soon"],            reading: "Waiting. Time." },
        { id: "obj_star",     label: "Star",     emoji: "⭐", tags: ["special", "highlight", "want"],    reading: "Special. Wanted." },
        { id: "obj_hand",     label: "Hand",     emoji: "✋", tags: ["stop", "help", "reach"],           reading: "Stop. Help." },
        { id: "obj_heart2",   label: "Care",     emoji: "🫶", tags: ["care", "together", "support"],     reading: "Together. Care." },
        { id: "obj_question", label: "Question", emoji: "❓", tags: ["confused", "ask", "unsure"],       reading: "Uncertain. Asking." },
        { id: "obj_warn",     label: "Warning",  emoji: "⚠️", tags: ["careful", "danger", "alert"],      reading: "Danger. Caution." }
      ]
    }
  ]
};

const TIERED_READINGS = [
  // 0 — empty canvas (handled elsewhere)
  null,

  // 1 — fallback if a symbol has no reading of its own
  {
    main: "A mark on its own. I'm listening.",
    options: []
  },

  // 2 — short: two pieces start to relate
  {
    main: "Things are leaning toward each other now. A feeling, and something it points to.",
    options: [
      "Maybe it's tears and a door: feeling sad, and wanting to step away from here.",
      "Or maybe it's hunger and bread: feeling empty, and reaching for something to eat."
    ]
  },

  // 3 — a little longer: a small situation forms
  {
    main: "A mood, a place, and something wanted. It starts to read like a small wish: I feel this way, and here is what I'd like.",
    options: [
      "Maybe it's calm, the sofa, and the dog: a settled feeling, a soft place to be, and someone to share it with.",
      "Or maybe it's feeling low, the bed, and the quiet of blue: tired in the body, and wanting to lie down somewhere still.",
      "Or restless, the door, and the open day: too much energy indoors, and a pull to get outside."
    ]
  },

  // 4 — clearer scene
  {
    main: "A scene is taking shape. There's a feeling at the centre, a colour around it, a place to be, and a thing that's needed. Put together, it sounds less like symbols and more like a sentence someone is trying to say.",
    options: [
      "Maybe it's feeling unwell, the bed, the colour blue, and the medicine: the body isn't right, and what's wanted is rest and something to ease it.",
      "Or a smile, the sun, the colour green, and the dog: a good mood, a bright day, and the wish to go out and play with a companion.",
      "Or feeling scared, the door, a warning, and a reaching hand: something ahead feels unsafe, and going through it alone is too much to ask."
    ]
  },

  // 5 — a small paragraph
  {
    main: "The picture gets specific now. A feeling sets the tone, a colour deepens it, a place holds it, and the rest say what should happen next. This is where loose marks turn into a request: not just how I feel, but what I want you to do about it.",
    options: [
      "Maybe it's fear by the door, in the dark, with a hand reaching out: afraid of what's outside, and asking you not to send me through it on my own.",
      "Or a smile with food, a warm cup, and home: a calm and happy mood, and a wish for a meal shared together in a place that already feels safe.",
      "Or tiredness, the bed, the clock, and medicine: worn out and aching, aware it's late, and quietly saying that what I need most right now is to rest."
    ]
  },

  // 6 — fuller paragraph, concrete combinations
  {
    main: "These are no longer random. Sharp, red, water, a cup, and tears read like a spill in the kitchen that turned frightening. Round, blue, a sofa, a dog, and a calm face read like a soft evening at home with someone close. The marks have started telling a story, piece by piece.",
    options: [
      "Maybe it's a kitchen moment: the sharp shape, the red, the water and the cup, and the tears, together saying that something spilled and the fright of it still hasn't passed.",
      "Or a quiet home: the circle, the blue, the sofa, the dog, and the calm face, all pointing to an easy evening with nothing needed except for you to stay nearby.",
      "Or too much at once: the noise, the bright burst, the anger, and the door, reading like a room that has become overwhelming and a need to get out of it now."
    ]
  },

  // 7 — long, layered narrative
  {
    main: "Layered now. A sick face at a desk with medicine, a bed, and home: I don't feel right and I want to go where it's safe. Or a laughing face under the sun with a dog, green, and a star: a good day outside, and something about it felt special. Each new mark adds a layer of feeling, place, need, and comfort, until the meaning is almost spoken aloud.",
    options: [
      "Maybe it's being sick at school: the body feels wrong in a place that asks too much, and what's wanted is to go home, lie down, and have someone take the day off worrying.",
      "Or a day out in the sun: laughter, warmth, a pet alongside, and the green of being outdoors, adding up to a small, bright memory worth holding on to and telling you about.",
      "Or a hard morning that hasn't lifted: tired before it began, frustrated by something small, and reaching, underneath all of it, for a bit of comfort and a steadier feeling."
    ]
  },

  // 8 (and beyond) — the full story
  {
    main: "It has become a whole story told without a word. Waking up tired to a blue morning at home, bread and milk on the table, the clock waiting, a door to step through, the dog coming along, and someone loved at the end of it. Or something harder: a sharp red anger in a place that doesn't feel safe, tears, a warning, and a hand reaching for help. What began as a small shape has grown into everything they needed you to understand.",
    options: [
      "Maybe it's a whole day laid out in order: waking tired into a blue morning, breakfast on the table, the clock moving on, a door to go through with the dog beside me, and the comfort of someone I love waiting at the end of it all.",
      "Or a need that has been there the whole time, only now spelled out clearly enough to follow: the plain fact of hunger, or a pain that won't settle, or a sadness that has been sitting quietly under everything else and finally asks to be named.",
      "Or a feeling built up piece by piece until it can't be missed: joy gathered from small bright things, or a fear made of sharp colour and unsafe places, each simply asking, in the only language available, to be noticed and answered."
    ]
  }
];
