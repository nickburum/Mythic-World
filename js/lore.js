/* js/lore.js — All mythological content, NPC dialogue trees, realm definitions */
/* No AI is used for NPC dialogue — all content is hand-authored from historical sources */

const REALMS = {
  greek: {
    name: "The Greek Underworld",
    sky: 0x120808, ground: 0x1a1208, fog: 0x0d0505,
    ambientColor: 0x3a1a08, torchColor: 0xff6020,
    npcs: [
      {
        name: "Charon, Ferryman of the Dead",
        color: 0x334466,
        lore: "In Homer's Odyssey and Virgil's Aeneid, Charon ferries souls across the rivers Styx and Acheron. He demands a coin — placed on the eye or under the tongue of the deceased. Those without payment wander the shore for a hundred years.",
        pos: { angle: Math.PI / 4, dist: 7 },
        dialogueTree: {
          start: {
            text: "Another seeker drifts to my shore. The River Styx has many faces, but it remembers all who cross. Do you know why the waters never forget?",
            choices: [
              { label: "Tell me of the Styx", next: "styx" },
              { label: "Ask about the shades here", next: "shades" },
              { label: "I seek passage deeper", next: "passage" }
            ]
          },
          styx: {
            text: "The Styx was the daughter of the Titan Oceanus. When the Olympians swore their most sacred oaths, they swore by her name. Even Zeus feared to break such a vow. The river witnessed every war between gods and men.",
            choices: [
              { label: "What oath was broken here?", next: "oath" },
              { label: "Ask about the coin of passage", next: "coin" },
              { label: "Farewell, ferryman", next: null }
            ]
          },
          oath: {
            text: "Helios once swore by the Styx to grant his son Phaethon any wish. The boy wished to drive the solar chariot. Unable to control those divine horses, he scorched the earth — Zeus struck him down to save the world from ruin. The Styx does not forget broken oaths.",
            choices: [
              { label: "A cautionary tale", next: "wisdom" },
              { label: "Farewell, ferryman", next: null }
            ]
          },
          coin: {
            text: "A single obol — the smallest Greek coin — placed upon the eyes or tongue of the dead. Those without it wander the shore for a hundred years. This is why the Greeks were so careful with burial rites. To deny someone burial was the cruelest curse imaginable.",
            choices: [
              { label: "Tell me of burial rites", next: "burial" },
              { label: "Farewell, ferryman", next: null }
            ]
          },
          burial: {
            text: "Antigone, daughter of Oedipus, defied King Creon's law to bury her brother Polynices. She knew death awaited her. 'I was not born to share in hatred, but to share in love,' she said. Creon sealed her in a cave. The gods punished him — his own son and wife took their lives that same day.",
            choices: [{ label: "Farewell, ferryman", next: null }]
          },
          shades: {
            text: "In Elysium rest the truly heroic — Achilles, who chose a short glorious life over a long forgotten one. In Tartarus suffer the truly wicked — Sisyphus forever rolling his stone; Tantalus forever hungry in a pool of water that retreats when he stoops to drink. Justice is the law of the dead.",
            choices: [
              { label: "Tell me of Sisyphus", next: "sisyphus" },
              { label: "Tell me of Achilles", next: "achilles" },
              { label: "Farewell, ferryman", next: null }
            ]
          },
          sisyphus: {
            text: "Sisyphus cheated death twice. The first time he shackled Thanatos himself, so no mortal could die. Ares had to free death. The second time, he convinced Persephone to let him return above to punish his wife — and simply refused to come back. His punishment: an eternal labour with no completion.",
            choices: [{ label: "Farewell, ferryman", next: null }]
          },
          achilles: {
            text: "Achilles told me once — when I ferried him here — 'I would rather be a slave to the poorest farmer above than king of all the dead.' He chose glory knowing it meant an early grave. Yet even here his shade walks tall, and the other shades give way when he passes.",
            choices: [{ label: "Farewell, ferryman", next: null }]
          },
          passage: {
            text: "Passage is not given freely. Heracles descended by force. Orpheus charmed me with his lyre — the only time music has moved these stone banks. Odysseus came with honey, milk and dark blood to call the shades. What do you bring, seeker?",
            choices: [
              { label: "Tell me of Orpheus", next: "orpheus" },
              { label: "I bring only questions", next: "questions" },
              { label: "Farewell, ferryman", next: null }
            ]
          },
          orpheus: {
            text: "He played, and even I wept — I who have ferried ten thousand thousand souls and felt nothing. The Furies wept. Cerberus laid down his three heads. Sisyphus sat upon his stone. Tantalus forgot his hunger. Persephone herself granted his wish. He only had to walk out without looking back. He looked back.",
            choices: [
              { label: "Why did he look back?", next: "lookback" },
              { label: "Farewell, ferryman", next: null }
            ]
          },
          lookback: {
            text: "That is the question poets have asked for three thousand years. Love that cannot trust. Or perhaps he knew — some things, once lost, cannot truly be recovered. The looking back was not his failure. It was his humanity.",
            choices: [{ label: "Farewell, ferryman", next: null }]
          },
          questions: {
            text: "Then you are wiser than most who come here clutching swords and torches. Questions are a finer currency than gold. The dead have all the time there is.",
            choices: [{ label: "Tell me of the shades", next: "shades" }, { label: "Farewell, ferryman", next: null }]
          },
          wisdom: {
            text: "Every myth is a lesson disguised as a story. The Greeks knew this. They were not a simple people.",
            choices: [{ label: "Farewell, ferryman", next: null }]
          }
        }
      },
      {
        name: "A Shade of Persephone's Court",
        color: 0x553366,
        lore: "Persephone, daughter of Demeter, was abducted by Hades and became Queen of the Underworld. Her annual return causes spring; her descent brings winter. The Homeric Hymn to Demeter records this story in full.",
        pos: { angle: Math.PI * 1.2, dist: 9 },
        dialogueTree: {
          start: {
            text: "I was a priestess of Demeter, above. Now I tend these asphodel meadows. Do not pity me — I have learned more in death than I ever knew in life. The Queen herself speaks to us sometimes.",
            choices: [
              { label: "Tell me of Persephone", next: "persephone" },
              { label: "What grows in asphodel?", next: "asphodel" },
              { label: "Farewell, shade", next: null }
            ]
          },
          persephone: {
            text: "She is not a prisoner — not anymore. She chose to stay, some say. She ate six pomegranate seeds knowingly. Hades consulted her on all judgments. The Greeks understood: even in darkness, there is authority. She is not less than Zeus — only different.",
            choices: [
              { label: "Ask about the pomegranate", next: "pomegranate" },
              { label: "Farewell, shade", next: null }
            ]
          },
          pomegranate: {
            text: "The pomegranate was the fruit of the dead — its red seeds like drops of blood, its chambers like the halls of the Underworld. To eat of it was to belong to this place. Six seeds meant six months below. Six months of winter above, while Demeter mourns.",
            choices: [{ label: "Farewell, shade", next: null }]
          },
          asphodel: {
            text: "The asphodel is a pale flower, neither beautiful nor ugly. It grows where ordinary souls dwell — those neither heroes nor villains. Most of us end here. Is that so terrible? Eternity in mediocrity... or perhaps, in peace.",
            choices: [{ label: "Farewell, shade", next: null }]
          }
        }
      }
    ],
    memorystones: [
      { x: -8, z: -4, lore: "Here stood the Gate of Horn, through which true dreams pass into the waking world. Ivory gates send only false visions — so Homer wrote in the Odyssey, Book XIX." },
      { x: 12, z: 8, lore: "The River Lethe flows here — the river of forgetfulness. Souls about to be reborn drink from it, erasing all memory of their time among the dead. The River Mnemosyne — Memory — runs alongside it for initiates of the Orphic mysteries." }
    ]
  },

  norse: {
    name: "Yggdrasil — The World Tree",
    sky: 0x080c14, ground: 0x0a1008, fog: 0x060810,
    ambientColor: 0x102030, torchColor: 0x40b0ff,
    npcs: [
      {
        name: "Mimir, Guardian of the Well",
        color: 0x224422,
        lore: "Mimir guards the Well of Wisdom beneath Yggdrasil. Odin sacrificed one eye to drink from it. After Mimir was beheaded in the Aesir-Vanir War, Odin preserved his head with herbs and runes to continue consulting him for counsel.",
        pos: { angle: Math.PI / 3, dist: 7 },
        dialogueTree: {
          start: {
            text: "Another who finds the Well. The All-Father gave an eye for one sip. What would you sacrifice for wisdom, Seeker?",
            choices: [
              { label: "Tell me of Odin's sacrifice", next: "odin_eye" },
              { label: "Ask about the World Tree", next: "yggdrasil" },
              { label: "What lies at the roots?", next: "roots" }
            ]
          },
          odin_eye: {
            text: "He came before the first war of the gods. He asked for a drink. I asked for his eye. He did not hesitate — he plucked it out and dropped it into the well. Look into the water and you may still see it gazing upward. He gained the ability to see all things past and future. Yet he could not prevent Ragnarök.",
            choices: [
              { label: "Tell me of Ragnarök", next: "ragnarok" },
              { label: "Why couldn't he prevent it?", next: "fate" },
              { label: "Farewell, Mimir", next: null }
            ]
          },
          ragnarok: {
            text: "The twilight of the gods. Fenrir the great wolf breaks his chains. The Midgard Serpent rises from the ocean. Loki leads an army of the dead on the ship Naglfar, made from the fingernails of corpses. Thor kills the Serpent but dies from its venom after nine steps. Odin is swallowed by Fenrir. The world burns — then rises again, green and new.",
            choices: [
              { label: "Who survives Ragnarök?", next: "survivors" },
              { label: "Farewell, Mimir", next: null }
            ]
          },
          survivors: {
            text: "Baldr returns from the dead. Two humans — Líf and Lífþrasir — hide in Hoddmímis holt and repopulate the earth. Some gods survive: Víðarr, who kills Fenrir; Váli; Baldr and Höðr reconciled. The Norse did not see this as tragedy — they saw it as transformation. All things must end so new things may begin.",
            choices: [{ label: "Farewell, Mimir", next: null }]
          },
          fate: {
            text: "The Norns — Urðr, Verðandi, and Skuld — weave fate at the base of this very tree. What they weave cannot be unwoven, not even by gods. Odin knew his death. He prepared as best he could. Perhaps that is all any being can do — face the known end with open eyes.",
            choices: [
              { label: "Tell me of the Norns", next: "norns" },
              { label: "Farewell, Mimir", next: null }
            ]
          },
          norns: {
            text: "They draw water from this Well each day and pour it over the roots of Yggdrasil to keep it healthy. Urðr is the past, Verðandi the present, Skuld the future. They carve runes into the bark of the Tree — those runes become the fate of every living thing.",
            choices: [{ label: "Farewell, Mimir", next: null }]
          },
          yggdrasil: {
            text: "The great Ash spans all nine worlds. Its three roots reach into Asgard, Jotunheim, and Niflheim. An eagle perches at its crown, the serpent Níðhöggr gnaws its roots. A squirrel named Ratatoskr runs between them, carrying insults to keep the conflict alive. Tension sustains creation.",
            choices: [
              { label: "Why does conflict keep the tree alive?", next: "conflict" },
              { label: "Farewell, Mimir", next: null }
            ]
          },
          conflict: {
            text: "Balance. The eagle represents cosmic order. The serpent represents chaos — erosion, destruction. If either wins, the tree dies. The Norse understood this deeply: a world without conflict is a dead world. Tension is what keeps all things growing.",
            choices: [{ label: "Farewell, Mimir", next: null }]
          },
          roots: {
            text: "Níðhöggr has gnawed the roots since before memory. He will gnaw until Ragnarök, when he finally flies free, carrying the corpses of the dishonored dead in his wings. Even now you can hear the sound of gnawing, far below.",
            choices: [{ label: "Farewell, Mimir", next: null }]
          }
        }
      }
    ],
    memorystones: [
      { x: -6, z: 6, lore: "Here Odin hung for nine days on Yggdrasil, pierced by his own spear, sacrificing himself to himself to discover the runes. From the Hávamál: 'I know that I hung on a windy tree, nine long nights, wounded with a spear.'" },
      { x: 10, z: -5, lore: "Valhalla's chosen — the Einherjar — train each day here, dying and rising, preparing for Ragnarök. The Valkyries chose only the bravest from the field of battle. Odin needed their strength for the final war." }
    ]
  },

  egypt: {
    name: "The Duat — Egyptian Afterlife",
    sky: 0x0c0a04, ground: 0x1a1508, fog: 0x080602,
    ambientColor: 0x302010, torchColor: 0xffcc00,
    npcs: [
      {
        name: "Anubis, Weigher of Hearts",
        color: 0x111a11,
        lore: "Anubis is the jackal-headed god of death and embalming. He presides over the weighing of the heart in the Hall of Two Truths, as described in the Book of the Dead — one of humanity's oldest surviving religious texts, dating to around 1550 BCE.",
        pos: { angle: Math.PI / 5, dist: 7 },
        dialogueTree: {
          start: {
            text: "You stand in the Hall of Two Truths. Your heart will be weighed against the feather of Ma'at — truth, justice, cosmic order. Are you ready to confess what you have and have not done?",
            choices: [
              { label: "Tell me of Ma'at", next: "maat" },
              { label: "What happens if the heart is heavy?", next: "ammit" },
              { label: "Explain the forty-two confessions", next: "confessions" }
            ]
          },
          maat: {
            text: "Ma'at is not merely a goddess — she is a principle woven into creation itself. When Ra first spoke the world into being, Ma'at was already there. She is truth, balance, justice, harmony, law. The feather represents her. A heart lighter than that feather passes into the Field of Reeds.",
            choices: [
              { label: "Tell me of the Field of Reeds", next: "field" },
              { label: "Ask about Ra's creation", next: "ra" },
              { label: "Farewell, Anubis", next: null }
            ]
          },
          field: {
            text: "Aaru — the Field of Reeds — is the Egyptian paradise. Not a vague heaven, but specific: the Nile delta, but perfect. Eternal harvest. The deceased farms there as in life, but the crops never fail and the floods never overflow. The Egyptians believed the afterlife should feel like a better version of this life, not an escape from it.",
            choices: [{ label: "Farewell, Anubis", next: null }]
          },
          ra: {
            text: "In the Heliopolitan tradition, Atum-Ra emerged from the primordial waters of Nun, stood upon the first mound of earth, and spoke. From his breath came Shu, the air. From his moisture, Tefnut. From them, Geb and Nut — earth and sky. Creation as family. Existence as relationship.",
            choices: [{ label: "Farewell, Anubis", next: null }]
          },
          ammit: {
            text: "Ammit — the Devourer. Head of a crocodile, forequarters of a lion, hindquarters of a hippopotamus — the three most feared animals of the Nile. If the heart is heavier than the feather, she eats it. That soul ceases to exist entirely. The second death — worse than any punishment, for there is no recovery.",
            choices: [
              { label: "How does one make the heart lighter?", next: "lighter" },
              { label: "Farewell, Anubis", next: null }
            ]
          },
          lighter: {
            text: "Live by Ma'at. The Egyptians believed morality was not merely social — it was cosmological. Every act of kindness kept the universe in balance. Every act of cruelty weakened creation itself. The heart remembers everything. It cannot be deceived.",
            choices: [{ label: "Farewell, Anubis", next: null }]
          },
          confessions: {
            text: "The Negative Confessions — forty-two declarations before forty-two divine judges. 'I have not committed sin. I have not committed robbery with violence. I have not acted with deceit. I have not killed men and women. I have not caused anyone to weep.' Each addressed to a specific god of a specific place in Egypt.",
            choices: [
              { label: "Tell me of the Book of the Dead", next: "book" },
              { label: "Farewell, Anubis", next: null }
            ]
          },
          book: {
            text: "Not a single book — nearly two hundred individual spells, assembled differently for each person. The oldest spells originated as the Pyramid Texts, carved inside pyramids for pharaohs around 2400 BCE — making them among the oldest religious writings that survive. Wealthy Egyptians commissioned personalized copies. The poor used simpler versions.",
            choices: [{ label: "Farewell, Anubis", next: null }]
          }
        }
      }
    ],
    memorystones: [
      { x: -9, z: 3, lore: "The Djed pillar stands here — symbol of Osiris's spine and of stability. Osiris was murdered by his brother Set, his body scattered across Egypt, reassembled by his wife Isis, who fanned life back into him with her wings. He became the first resurrected god." },
      { x: 8, z: -7, lore: "Here Thoth records the verdict of every weighing. The ibis-headed god of writing, magic, and wisdom scribes each soul's fate — a record that persists forever in the divine library of the Duat." }
    ]
  },

  celtic: {
    name: "Tir na nÓg — The Eternal Land",
    sky: 0x060d08, ground: 0x081408, fog: 0x040a05,
    ambientColor: 0x102818, torchColor: 0x50ff80,
    npcs: [
      {
        name: "Niamh of the Golden Hair",
        color: 0x336633,
        lore: "Niamh is the daughter of Manannán mac Lir, god of the sea, in Irish mythology. She brought the hero Oisín to Tir na nÓg on her white horse across the western sea. Their story is told in the Fenian Cycle, particularly 'The Lay of Oisín in the Land of Youth.'",
        pos: { angle: Math.PI / 2, dist: 8 },
        dialogueTree: {
          start: {
            text: "Welcome to Tir na nÓg — the Land of the Young, where sorrow is unknown and beauty never fades. I brought Oisín here once, on my white horse across the western sea. He stayed three hundred years, thinking it was three.",
            choices: [
              { label: "Tell me of Oisín", next: "oisin" },
              { label: "Why does time move differently here?", next: "time" },
              { label: "Tell me of your father Manannán", next: "manannan" }
            ]
          },
          oisin: {
            text: "He was the greatest poet of the Fianna — Finn mac Cumhaill's warrior band. He came willingly. We had a son, Oscar. But he longed for Ireland. I gave him my white horse, warned him never to touch Irish soil. He leaned down to help an old man lift a stone... and three hundred years of age fell on him at once.",
            choices: [
              { label: "Why could he not touch the soil?", next: "soil" },
              { label: "Tell me of the Fianna", next: "fianna" },
              { label: "Farewell, Niamh", next: null }
            ]
          },
          soil: {
            text: "Tir na nÓg exists outside mortal time. To live here is to step outside the river of years. The moment he touched Irish earth, time reclaimed him. Some believe it is a metaphor: once you have truly left your home — in your heart — you can never truly return. The Ireland he sought was already gone.",
            choices: [{ label: "Farewell, Niamh", next: null }]
          },
          fianna: {
            text: "The Fianna were elite warriors of ancient Ireland — hunters, warriors, poets. To join, a man had to memorize twelve books of poetry, compose verse under pressure, and defend himself in a hole with only a shield and hazel stick while warriors hurled spears. They were protectors of the High King and roamers of the wild places.",
            choices: [
              { label: "Tell me of Finn mac Cumhaill", next: "finn" },
              { label: "Farewell, Niamh", next: null }
            ]
          },
          finn: {
            text: "As a boy he touched the Salmon of Knowledge — the fish that had eaten all the hazelnuts of wisdom fallen from the trees around the Well of Wisdom. He burned his thumb on it while cooking it for his master, sucked the burn, and gained all the world's knowledge in an instant. Ever after, when he sucked his thumb, truth was revealed to him.",
            choices: [{ label: "Farewell, Niamh", next: null }]
          },
          time: {
            text: "The Celts understood time as cyclical, not linear. The otherworld exists in the gaps between mortal moments. Samhain and Beltane are when those gaps widen. Enter a fairy mound — the sidhe — and centuries may pass in what feels like a night. It is not magic. It is a different relationship with time itself.",
            choices: [
              { label: "Tell me of the sidhe", next: "sidhe" },
              { label: "Farewell, Niamh", next: null }
            ]
          },
          sidhe: {
            text: "The Tuatha Dé Danann — the divine race who preceded the Gaels — were defeated at the Battle of Tailtiu. Rather than leave entirely, they retreated into the hollow hills. They became the fairy folk of later legend. They are not small or delicate. They are ancient beings of terrible beauty who merely withdrew from a world that no longer needed them openly.",
            choices: [{ label: "Farewell, Niamh", next: null }]
          },
          manannan: {
            text: "My father rules the seas between this world and the mortal one. His cloak shifts color like the ocean. He gave Lugh the sword Fragarach — 'The Answerer' — which could cut through any armor and compel truth from those it wounded. He is a god of hospitality, trade, and the boundaries between worlds.",
            choices: [{ label: "Farewell, Niamh", next: null }]
          }
        }
      }
    ],
    memorystones: [
      { x: -7, z: -8, lore: "Here the Cauldron of Dagda rests — the magical vessel that could feed an army and never be exhausted. Dagda also possessed a club that could kill with one end and restore life with the other. He was the 'Good God' — good at all things." },
      { x: 11, z: 4, lore: "The path to Emain Ablach — the Isle of Apples — begins here. Some scholars connect it to the Arthurian Avalon, where the wounded Arthur was taken to heal. Both represent the same ancient idea: a western isle beyond the sea where the dead and the divine coexist." }
    ]
  },

  sumerian: {
    name: "The Cedar Forest of Enlil",
    sky: 0x0a0908, ground: 0x100c06, fog: 0x080706,
    ambientColor: 0x281808, torchColor: 0xff9040,
    npcs: [
      {
        name: "Utnapishtim, the Far Away",
        color: 0x443322,
        lore: "Utnapishtim is the flood survivor of the Epic of Gilgamesh — written around 2100 BCE, one of humanity's oldest stories. The gods warned him of a coming flood; he built a great boat and survived, and was granted immortality. His account predates the Biblical Noah by over a thousand years.",
        pos: { angle: Math.PI / 6, dist: 8 },
        dialogueTree: {
          start: {
            text: "I have waited here since before your civilization remembered how to write. Gilgamesh himself found me, seeking immortality after his friend Enkidu died. He crossed the Waters of Death to reach me. Do you know why he failed?",
            choices: [
              { label: "Tell me of Gilgamesh", next: "gilgamesh" },
              { label: "Tell me of the great flood", next: "flood" },
              { label: "Why did he fail?", next: "fail" }
            ]
          },
          gilgamesh: {
            text: "He was two-thirds divine, one-third mortal — king of Uruk. The gods sent Enkidu to humble him, a wild man raised by animals. They wrestled to a standstill and became the greatest of friends. When Enkidu died — punishment for killing Humbaba and the Bull of Heaven — Gilgamesh could not accept it. He wandered for the first time, truly afraid.",
            choices: [
              { label: "Tell me of Enkidu", next: "enkidu" },
              { label: "Tell me of Humbaba", next: "humbaba" },
              { label: "Farewell", next: null }
            ]
          },
          enkidu: {
            text: "The gods made Enkidu from clay and divine breath. He lived in the wilderness among gazelles, knowing nothing of human civilization. A woman named Shamhat civilized him over seven days — after which the animals fled from him. He had become human. He lost paradise and gained consciousness. The same trade we all make.",
            choices: [{ label: "Farewell", next: null }]
          },
          humbaba: {
            text: "Guardian of the Cedar Forest — this very forest — appointed by the god Enlil to protect these trees. His face was made of coiled entrails; his voice was the voice of a flood. Gilgamesh and Enkidu killed him even as he begged for mercy. The gods debated who should die for this. Enkidu drew the short straw.",
            choices: [{ label: "Farewell", next: null }]
          },
          flood: {
            text: "The gods decided to destroy humanity — too noisy, too many. Ea warned me through the walls of my reed house: 'Man of Shuruppak, tear down your house and build a boat.' Rain fell for six days and nights. On the seventh day, silence. My boat rested on Mount Nimush. I released a dove, a swallow, a raven. The raven did not return — dry land.",
            choices: [
              { label: "How old is this story?", next: "age" },
              { label: "What happened after?", next: "aftermath" },
              { label: "Farewell", next: null }
            ]
          },
          age: {
            text: "The earliest Sumerian flood account was written around 2100 BCE. The most complete version was found on twelve clay tablets in Nineveh in 1853. A British scholar named George Smith recognized its similarity to the Biblical account and reportedly ran through the museum removing his clothes in excitement. The ancient world has a way of surprising even the most learned.",
            choices: [{ label: "Farewell", next: null }]
          },
          aftermath: {
            text: "Enlil was furious that any survived. Ea argued for mercy. Enlil relented — he granted my wife and me immortality and placed us here at the end of the world. We did not return to civilization. Immortality is not what seekers imagine it to be. Gilgamesh left here empty-handed, then had his tale written on lapis lazuli to endure forever. Perhaps that is the real immortality.",
            choices: [{ label: "Farewell", next: null }]
          },
          fail: {
            text: "I gave him one test: stay awake for seven days — a small proof of worthiness for eternal life. He fell asleep within moments. Sleep is the brother of death. He could not conquer even drowsiness. Brave, strong, brilliant — but mortal. That too is a kind of dignity.",
            choices: [
              { label: "Was there any other way?", next: "plant" },
              { label: "Farewell", next: null }
            ]
          },
          plant: {
            text: "I told him of a plant at the bottom of the sea — the Plant of Heartbeat, which restores youth. He dove to the ocean floor and retrieved it. A serpent stole it while he slept beside a pool. The serpent shed its skin and became young again. Gilgamesh wept. Then he went home and wrote everything down.",
            choices: [{ label: "Farewell", next: null }]
          }
        }
      }
    ],
    memorystones: [
      { x: -5, z: 9, lore: "The Tablet of Destinies was said to grant its holder power over all existence. The Anzu bird stole it from Enlil — the hero Ninurta recovered it after an epic battle in the mountains. Its location is now unknown, even to the gods." },
      { x: 9, z: -6, lore: "Inanna descended into the Underworld through seven gates, surrendering a garment at each. By the time she reached her sister Ereshkigal's throne, she was naked and powerless. Death and rebirth: the oldest myth of transformation, predating all others." }
    ]
  }
};
