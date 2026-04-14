// Pre-created seed passages with comprehension questions for immediate use without Ollama.
// Covers all 4 genres × 3 difficulty levels = 12 seed passages.

import type { PassageRecord, ComprehensionQuestion, Genre, DifficultyLevel } from '../types';

interface SeedPassage extends PassageRecord {
  questions: ComprehensionQuestion[];
}

function seed(
  id: string,
  genre: Genre,
  difficulty: DifficultyLevel,
  theme: string,
  paragraphs: string[],
  questions: ComprehensionQuestion[],
): SeedPassage {
  return {
    id,
    text: paragraphs.join('\n\n'),
    genre,
    difficulty,
    theme,
    paragraphs,
    taggedWords: [],
    questions,
    createdAt: new Date('2025-01-01'),
    completed: false,
    questionsAnswered: 0,
    questionsCorrect: 0,
  };
}

function q(
  id: string,
  text: string,
  type: ComprehensionQuestion['type'],
  modelAnswer: string,
  hints: string[],
  relevantSection: string,
): ComprehensionQuestion {
  return { id, text, type, modelAnswer, hints, relevantSection };
}

export const SEED_PASSAGES: SeedPassage[] = [
  // ── Fiction, Level 1 ──
  seed('seed-fiction-1', 'fiction', 1, 'adventure', [
    'Mia crept along the mossy path, her torch flickering in the damp air. The old map her grandfather had drawn showed a cave entrance behind the waterfall. She could hear the roar of water growing louder with every step.',
    'At last the trees parted and she saw it: a curtain of silver water tumbling over dark rocks. Behind the spray, just as the map promised, was a narrow gap in the cliff face. Mia took a deep breath and stepped through.',
    'Inside, the cave opened into a wide chamber. Crystals embedded in the walls caught her torchlight and scattered tiny rainbows across the ceiling. In the centre of the chamber sat a wooden chest, its lid carved with stars.',
    'Mia knelt beside the chest and lifted the lid. Inside lay a leather journal filled with her grandfather\'s handwriting, and a small brass compass that still pointed north. She smiled, knowing the real treasure was the story waiting to be read.',
  ], [
    q('sf1-q1', 'What did Mia use to find the cave?', 'retrieval', 'She used an old map her grandfather had drawn.', ['Think about what Mia was carrying.', 'Look at the first paragraph for a clue about directions.'], 'The old map her grandfather had drawn showed a cave entrance behind the waterfall.'),
    q('sf1-q2', 'Why do you think Mia smiled when she found the chest?', 'inference', 'She smiled because the journal contained her grandfather\'s story, which was more meaningful to her than gold or jewels.', ['What was inside the chest?', 'Think about why a journal might be special to Mia.'], 'Inside lay a leather journal filled with her grandfather\'s handwriting, and a small brass compass that still pointed north.'),
    q('sf1-q3', 'What does the word "embedded" mean in the sentence about the crystals?', 'vocabulary', 'Embedded means fixed firmly into a surrounding surface.', ['The crystals were part of the walls — they were stuck inside them.', 'Think of something pushed into a surface so it stays there.'], 'Crystals embedded in the walls caught her torchlight and scattered tiny rainbows across the ceiling.'),
    q('sf1-q4', 'Why did the author describe the waterfall as "a curtain of silver water"?', 'authors-purpose', 'The author used this metaphor to help the reader picture the waterfall as a thin, shimmering barrier that Mia had to pass through, making the scene feel magical.', ['Think about what a curtain looks like and does.', 'Why might the author compare water to fabric?'], 'A curtain of silver water tumbling over dark rocks.'),
    q('sf1-q5', 'Summarise what happens in this passage in two or three sentences.', 'summarisation', 'Mia follows her grandfather\'s map through a forest to a waterfall. She discovers a hidden cave filled with crystals. Inside, she finds a chest containing her grandfather\'s journal and compass.', ['Think about the beginning, middle, and end.', 'What are the three main things that happen?'], 'The entire passage describes Mia\'s journey from the path to the cave to finding the chest.'),
  ]),

  // ── Fiction, Level 2 ──
  seed('seed-fiction-2', 'fiction', 2, 'mystery', [
    'The library had been closed for three years, yet every morning a single book appeared on the front step, its pages open to a different chapter. Nobody in the village could explain it. The caretaker, Mr Finch, swore he had changed the locks twice.',
    'Twelve-year-old Arun decided to investigate. He borrowed his mother\'s wildlife camera and strapped it to the oak tree opposite the library entrance. That night he barely slept, imagining all the possible explanations.',
    'The footage revealed something unexpected. At exactly three in the morning, a tabby cat pushed through a gap in the basement window, dragged a book up the stairs in its mouth, and nudged it onto the step with its nose. The cat then sat beside the book, as if waiting for someone to read.',
    'Arun recognised the cat. It had belonged to Mrs Okafor, the old librarian who had passed away the year the library closed. He showed the footage to the village council, and within a month the library reopened, with a small plaque by the door that read: "For Mrs Okafor and her faithful companion."',
  ], [
    q('sf2-q1', 'How long had the library been closed?', 'retrieval', 'The library had been closed for three years.', ['Look at the very first sentence.', 'The answer is a number of years.'], 'The library had been closed for three years.'),
    q('sf2-q2', 'Why do you think the cat kept bringing books to the library step?', 'inference', 'The cat likely associated the library with its owner, Mrs Okafor, and continued the routine of placing books out as if the library were still open, showing loyalty to its deceased owner.', ['Who did the cat belong to?', 'Think about habits animals keep after their owners are gone.'], 'It had belonged to Mrs Okafor, the old librarian who had passed away the year the library closed.'),
    q('sf2-q3', 'What does "faithful" mean in the phrase "faithful companion"?', 'vocabulary', 'Faithful means loyal and devoted.', ['Think about what the cat did every single night without fail.', 'A companion who never gives up is described as...'], 'A small plaque by the door that read: "For Mrs Okafor and her faithful companion."'),
    q('sf2-q4', 'What is the main message the author wants the reader to take from this story?', 'authors-purpose', 'The author wants to show that loyalty and love can persist beyond death, and that small acts of devotion can inspire a whole community to act.', ['Think about what the cat\'s actions caused the village to do.', 'What feeling does the ending give you?'], 'He showed the footage to the village council, and within a month the library reopened.'),
    q('sf2-q5', 'Summarise the key events of this story.', 'summarisation', 'Books mysteriously appear outside a closed library each morning. Arun sets up a camera and discovers a cat — belonging to the late librarian — has been placing them there. The village reopens the library in her memory.', ['What is the mystery? How is it solved? What happens at the end?', 'Try to cover the problem, the investigation, and the result.'], 'The entire passage.'),
  ]),

  // ── Fiction, Level 3 ──
  seed('seed-fiction-3', 'fiction', 3, 'space', [
    'Commander Leila Vasquez pressed her forehead against the observation window and watched Earth shrink to the size of a marble. The Artemis IV had been accelerating for six hours, and already the familiar blue sphere looked impossibly distant. She wondered whether the colonists in the cargo hold felt the same quiet ache.',
    'The ship\'s AI, designated ORION, interrupted her thoughts with a gentle chime. "Commander, atmospheric recyclers are operating at ninety-two per cent efficiency. I recommend we reduce crew activity in Deck Seven to compensate." Leila nodded, appreciating the machine\'s calm precision even as her own nerves frayed.',
    'By the third week, routines had solidified into rituals. Breakfast at 0600, systems check at 0700, hydroponics inspection at 0900. The predictability was deliberate — psychologists had warned that unstructured time bred anxiety in deep-space crews. Leila added one personal ritual: every evening she recorded a two-minute message for her daughter, even though the transmission delay meant Priya would not hear it for days.',
    'On day forty-seven, ORION detected an anomaly — a faint electromagnetic signature that matched no known celestial object. Leila assembled the science team. As the data scrolled across the holographic display, Dr Osei whispered, "That\'s not natural." The bridge fell silent, every crew member aware that the mission had just changed irrevocably.',
  ], [
    q('sf3-q1', 'What was the atmospheric recycler efficiency when ORION reported?', 'retrieval', 'The atmospheric recyclers were operating at ninety-two per cent efficiency.', ['Look for a percentage mentioned by the AI.', 'ORION gives a specific number in the second paragraph.'], 'Atmospheric recyclers are operating at ninety-two per cent efficiency.'),
    q('sf3-q2', 'Why did Leila record messages for her daughter even though they would arrive days late?', 'inference', 'Recording the messages was a way for Leila to maintain an emotional connection with her daughter and cope with the isolation of deep space, even if the communication was not immediate.', ['Think about what the messages meant to Leila personally.', 'Why might someone keep a routine that seems impractical?'], 'Every evening she recorded a two-minute message for her daughter, even though the transmission delay meant Priya would not hear it for days.'),
    q('sf3-q3', 'What does "irrevocably" mean in the final sentence?', 'vocabulary', 'Irrevocably means in a way that cannot be changed or reversed.', ['The mission changed and could not go back to how it was before.', 'Think of a word that means "permanently" or "beyond undoing".'], 'Every crew member aware that the mission had just changed irrevocably.'),
    q('sf3-q4', 'Why did the author include the detail about psychologists warning against unstructured time?', 'authors-purpose', 'The author included this to make the setting feel realistic and scientifically grounded, showing that deep-space travel has genuine psychological challenges, and to explain why the crew follows such rigid routines.', ['What problem does unstructured time cause?', 'How does this detail make the story feel more believable?'], 'Psychologists had warned that unstructured time bred anxiety in deep-space crews.'),
    q('sf3-q5', 'Write a brief summary of the passage.', 'summarisation', 'Commander Vasquez leads the Artemis IV away from Earth. The crew settles into strict routines to manage the psychological strain of deep space. On day forty-seven, the ship\'s AI detects an unexplained signal, and the science team realises it is not natural, changing the mission entirely.', ['Cover the departure, the daily life, and the discovery.', 'What changes everything at the end?'], 'The entire passage.'),
  ]),

  // ── Non-fiction, Level 1 ──
  seed('seed-nonfiction-1', 'non-fiction', 1, 'animals', [
    'Octopuses are some of the cleverest animals in the ocean. They have eight arms, three hearts, and blue blood. Each arm can taste and feel things on its own, which helps the octopus explore rocky pools and coral reefs.',
    'One of the most amazing things about octopuses is how they change colour. Tiny cells in their skin called chromatophores can switch between red, brown, yellow, and even blue in less than a second. They use this skill to hide from predators and to send signals to other octopuses.',
    'Scientists have watched octopuses solve puzzles in laboratories. They can unscrew jar lids to reach food inside, and some have even been seen sneaking out of their tanks at night to steal fish from neighbouring tanks before returning to their own.',
    'Despite their intelligence, octopuses live short lives — most species survive for only one to two years. This means each octopus must learn everything it needs to know very quickly, without help from its parents.',
  ], [
    q('snf1-q1', 'How many hearts does an octopus have?', 'retrieval', 'An octopus has three hearts.', ['Look at the first paragraph for body facts.', 'The answer is a number.'], 'They have eight arms, three hearts, and blue blood.'),
    q('snf1-q2', 'Why might it be useful for each arm to taste and feel independently?', 'inference', 'It allows the octopus to explore multiple hiding spots or food sources at the same time, making it more efficient at finding food and avoiding danger.', ['Think about what the arms are doing while exploring.', 'What advantage does having independent arms give?'], 'Each arm can taste and feel things on its own, which helps the octopus explore rocky pools and coral reefs.'),
    q('snf1-q3', 'What are chromatophores?', 'vocabulary', 'Chromatophores are tiny cells in an octopus\'s skin that can change colour.', ['The passage explains this word directly.', 'Look for the definition right after the word is introduced.'], 'Tiny cells in their skin called chromatophores can switch between red, brown, yellow, and even blue.'),
    q('snf1-q4', 'Why does the author mention octopuses stealing fish from other tanks?', 'authors-purpose', 'The author includes this surprising and entertaining example to demonstrate just how intelligent and resourceful octopuses are, making the text more engaging for the reader.', ['Is this a serious scientific fact or a fun story?', 'What does it prove about octopuses?'], 'Some have even been seen sneaking out of their tanks at night to steal fish from neighbouring tanks.'),
    q('snf1-q5', 'Summarise the main facts about octopuses from this passage.', 'summarisation', 'Octopuses have eight arms, three hearts, and blue blood. They can change colour using chromatophores. They are intelligent enough to solve puzzles and open jars. Despite this, they only live one to two years.', ['What are the key facts from each paragraph?', 'Try to include one fact from each section.'], 'The entire passage.'),
  ]),

  // ── Non-fiction, Level 2 ──
  seed('seed-nonfiction-2', 'non-fiction', 2, 'space', [
    'In 1977, NASA launched two spacecraft called Voyager 1 and Voyager 2. Their original mission was to study Jupiter and Saturn, but they performed so well that scientists decided to keep them going. Today, more than forty-five years later, both spacecraft are still sending data back to Earth from the edge of our solar system.',
    'Voyager 1 is now the most distant human-made object in existence. It has travelled over twenty-four billion kilometres from Earth — so far that a radio signal from the spacecraft takes more than twenty-two hours to reach us, even though radio waves travel at the speed of light.',
    'Each Voyager carries a Golden Record: a gold-plated disc containing sounds and images chosen to represent life on Earth. The record includes greetings in fifty-five languages, music from different cultures, and photographs of people, animals, and landscapes. It was designed as a message to any intelligent life that might one day find the spacecraft.',
    'The Voyagers\' power comes from devices called radioisotope thermoelectric generators, which convert heat from decaying plutonium into electricity. These generators lose about four watts of power each year, and scientists estimate that by around 2025 there will not be enough power left to run any instruments. After that, the Voyagers will drift silently through interstellar space for millions of years.',
  ], [
    q('snf2-q1', 'When were the Voyager spacecraft launched?', 'retrieval', 'They were launched in 1977.', ['The answer is in the first sentence.', 'Look for a year.'], 'In 1977, NASA launched two spacecraft called Voyager 1 and Voyager 2.'),
    q('snf2-q2', 'Why do you think scientists chose to include greetings in fifty-five languages on the Golden Record?', 'inference', 'They wanted to represent the diversity of human cultures and languages, showing that Earth is home to many different peoples, in case an alien civilisation found the disc.', ['Who is the Golden Record meant for?', 'Why would variety matter in a message to unknown beings?'], 'The record includes greetings in fifty-five languages, music from different cultures, and photographs.'),
    q('snf2-q3', 'What does "interstellar" mean?', 'vocabulary', 'Interstellar means between the stars — the space outside our solar system.', ['Break the word into parts: "inter" means between, "stellar" relates to stars.', 'Where are the Voyagers heading after leaving the solar system?'], 'The Voyagers will drift silently through interstellar space for millions of years.'),
    q('snf2-q4', 'Summarise what the Golden Record is and why it was created.', 'summarisation', 'The Golden Record is a gold-plated disc carried by each Voyager spacecraft. It contains sounds, music, images, and greetings in fifty-five languages, chosen to represent life on Earth as a message to any intelligent life that might find it.', ['What is on the record?', 'What is its purpose?'], 'Each Voyager carries a Golden Record: a gold-plated disc containing sounds and images chosen to represent life on Earth.'),
  ]),

  // ── Non-fiction, Level 3 ──
  seed('seed-nonfiction-3', 'non-fiction', 3, 'animals', [
    'The migration of the Arctic tern is one of the most extraordinary journeys in the animal kingdom. Each year, this small seabird flies from its breeding grounds in the Arctic to the Antarctic and back again — a round trip of approximately seventy thousand kilometres. Over its lifetime of thirty years, a single tern may travel the equivalent of three return trips to the Moon.',
    'What makes this feat even more remarkable is the tern\'s size. Weighing barely one hundred grams, it must navigate across open oceans, through storms, and past predators, relying on a combination of the Earth\'s magnetic field, the position of the sun, and visual landmarks to find its way.',
    'Scientists fitted miniature tracking devices to Arctic terns and discovered that the birds do not fly in a straight line. Instead, they follow a zigzag route that takes advantage of prevailing wind patterns, effectively using the atmosphere as a conveyor belt. This strategy reduces the energy cost of the journey by as much as twenty-five per cent.',
    'The tern\'s migration also means it experiences more daylight than any other creature on the planet. By spending the northern summer in the Arctic and the southern summer in the Antarctic, it lives in almost perpetual sunlight, which may partly explain its remarkable longevity for a bird of its size.',
  ], [
    q('snf3-q1', 'How far does an Arctic tern fly in one round trip?', 'retrieval', 'Approximately seventy thousand kilometres.', ['Look for a distance in the first paragraph.', 'The answer is given in kilometres.'], 'A round trip of approximately seventy thousand kilometres.'),
    q('snf3-q2', 'Why do the terns follow a zigzag route rather than flying in a straight line?', 'inference', 'The zigzag route allows them to take advantage of prevailing wind patterns, which acts like a conveyor belt and reduces the energy they need to spend by up to twenty-five per cent.', ['What do the winds do for the birds?', 'Think about energy saving.'], 'They follow a zigzag route that takes advantage of prevailing wind patterns, effectively using the atmosphere as a conveyor belt.'),
    q('snf3-q3', 'What does "perpetual" mean in the phrase "almost perpetual sunlight"?', 'vocabulary', 'Perpetual means never-ending or continuous.', ['The terns are always in a place where it is summer.', 'Think of a word that means "going on forever".'], 'It lives in almost perpetual sunlight.'),
    q('snf3-q4', 'Why does the author compare the tern\'s lifetime distance to trips to the Moon?', 'authors-purpose', 'The author uses this comparison to help the reader grasp the enormous total distance, since most people can imagine how far the Moon is but cannot easily picture seventy thousand kilometres repeated over thirty years.', ['Why use the Moon as a comparison?', 'Does it make the number easier to understand?'], 'A single tern may travel the equivalent of three return trips to the Moon.'),
    q('snf3-q5', 'Summarise the key points about the Arctic tern\'s migration.', 'summarisation', 'The Arctic tern migrates seventy thousand kilometres annually between the Arctic and Antarctic. Despite weighing only one hundred grams, it navigates using magnetic fields, the sun, and landmarks. It follows a zigzag route to save energy using wind patterns, and experiences more daylight than any other animal.', ['Cover the distance, the navigation, the route strategy, and the daylight fact.', 'One point per paragraph.'], 'The entire passage.'),
  ]),

  // ── Poetry, Level 1 ──
  seed('seed-poetry-1', 'poetry', 1, 'animals', [
    'The owl sits high in the old oak tree,\nHer golden eyes see what we cannot see.\nShe turns her head without a sound,\nAnd watches moonlight touch the ground.',
    'A mouse runs fast across the lane,\nThe owl drops down like silver rain.\nHer wings spread wide, her talons tight,\nShe rises up into the night.',
    'The forest hushes, still and deep,\nWhile little creatures curl to sleep.\nBut the owl keeps watch till morning light,\nThe silent guardian of the night.',
  ], [
    q('sp1-q1', 'Where does the owl sit?', 'retrieval', 'The owl sits high in the old oak tree.', ['Look at the very first line.', 'What type of tree is mentioned?'], 'The owl sits high in the old oak tree.'),
    q('sp1-q2', 'Why does the poet call the owl "the silent guardian of the night"?', 'inference', 'The poet calls the owl a silent guardian because it watches over the forest while other animals sleep, protecting the night like a guard who makes no noise.', ['What does a guardian do?', 'What is the owl doing while others sleep?'], 'But the owl keeps watch till morning light, the silent guardian of the night.'),
    q('sp1-q3', 'What does "hushes" mean in "The forest hushes, still and deep"?', 'vocabulary', 'Hushes means becomes quiet or silent.', ['Think about what a forest sounds like at night.', 'What word means "goes quiet"?'], 'The forest hushes, still and deep.'),
    q('sp1-q4', 'Why does the poet compare the owl dropping down to "silver rain"?', 'authors-purpose', 'The poet uses this simile to show how quickly and smoothly the owl moves — like rain falling, it is fast, silent, and almost beautiful to watch, even though it is hunting.', ['What does rain look like when it falls?', 'Is the owl moving fast or slow?'], 'The owl drops down like silver rain.'),
  ]),

  // ── Poetry, Level 2 ──
  seed('seed-poetry-2', 'poetry', 2, 'adventure', [
    'I found a door in the garden wall,\nHalf-hidden by the ivy\'s crawl.\nIts paint was cracked, its hinges rust,\nBut something whispered, "Try. You must."',
    'I pushed it open, held my breath,\nAnd stepped across the mossy step.\nBeyond the wall the world had changed:\nThe colours brighter, sounds re-arranged.',
    'A river sang in silver notes,\nThe trees wore coats of emerald green.\nA path of stones led up a hill\nTo places I had never seen.',
    'I walked until the sun went down,\nThen turned and found the door once more.\nI stepped back through and closed it tight,\nBut kept the wonder that I wore.',
  ], [
    q('sp2-q1', 'What was the door hidden by?', 'retrieval', 'The door was half-hidden by ivy.', ['Look at the second line of the first verse.', 'What plant is mentioned?'], 'Half-hidden by the ivy\'s crawl.'),
    q('sp2-q2', 'What do you think the poet means by "kept the wonder that I wore"?', 'inference', 'The poet means that even though they returned to the normal world, they kept the feeling of amazement and magic from their adventure, as if wonder were something you could carry with you like clothing.', ['What does "wore" usually refer to?', 'Can you "wear" a feeling?'], 'But kept the wonder that I wore.'),
    q('sp2-q3', 'What does "re-arranged" suggest about the sounds beyond the wall?', 'vocabulary', 'Re-arranged means organised differently — the sounds were not the same as normal; they were changed into something new and unfamiliar.', ['What does "arrange" mean? What does "re-" add?', 'Were the sounds normal or different?'], 'The colours brighter, sounds re-arranged.'),
    q('sp2-q4', 'Why does the poet use the phrase "A river sang in silver notes"?', 'authors-purpose', 'The poet personifies the river (giving it the ability to sing) and uses the metaphor of silver notes to make the magical world feel alive and musical, appealing to the reader\'s sense of hearing.', ['Can a river really sing?', 'What effect does giving human qualities to nature create?'], 'A river sang in silver notes.'),
    q('sp2-q5', 'Summarise what happens in this poem.', 'summarisation', 'The narrator discovers a hidden door in a garden wall and steps through into a magical world with vivid colours and singing rivers. They explore until sunset, then return through the door, keeping the sense of wonder with them.', ['What does the narrator find, where do they go, and what do they bring back?', 'Cover the discovery, the journey, and the return.'], 'The entire poem.'),
  ]),

  // ── Poetry, Level 3 ──
  seed('seed-poetry-3', 'poetry', 3, 'mystery', [
    'The lighthouse keeper counts the waves,\nEach one a secret the ocean saves.\nHe marks them down in fading ink,\nStanding always on the brink.',
    'His logbook holds a thousand storms,\nThe shapes of ships in broken forms.\nHe writes of fog that swallows light,\nOf voices carried through the night.',
    'Some say the keeper is a ghost,\nA figure pinned to England\'s coast.\nHis lamp still turns though no one climbs\nThe spiral stairs at closing times.',
    'But I have seen his shadow fall\nAcross the rocks, across the wall.\nAnd in the beam that sweeps the bay,\nA hand that waves, then turns away.',
  ], [
    q('sp3-q1', 'What does the lighthouse keeper write in his logbook?', 'retrieval', 'He writes about storms, the shapes of broken ships, fog that swallows light, and voices carried through the night.', ['Look at the second verse for details.', 'What events does he record?'], 'His logbook holds a thousand storms, the shapes of ships in broken forms. He writes of fog that swallows light, of voices carried through the night.'),
    q('sp3-q2', 'Do you think the lighthouse keeper is alive or a ghost? Use evidence from the poem.', 'inference', 'The poem strongly suggests he is a ghost: "Some say the keeper is a ghost," the lamp turns with no one climbing the stairs, and the narrator only sees a shadow and a hand that "turns away." However, the ambiguity is deliberate.', ['What do other people say about him?', 'What does the narrator actually see — a person or a shadow?'], 'Some say the keeper is a ghost. His lamp still turns though no one climbs the spiral stairs.'),
    q('sp3-q3', 'What does "on the brink" mean in the first verse?', 'vocabulary', 'On the brink means on the very edge — both literally (standing at the edge of the cliff or lighthouse platform) and figuratively (on the edge between the known world and the mysterious ocean).', ['Where is the keeper standing physically?', 'Can "brink" also mean the edge of something happening?'], 'Standing always on the brink.'),
    q('sp3-q4', 'Why does the poet use the phrase "fog that swallows light"?', 'authors-purpose', 'The poet personifies the fog, giving it the aggressive action of swallowing, to create a sense of danger and to show how powerful and consuming the fog is — it can even defeat the lighthouse beam.', ['Can fog really swallow anything?', 'What effect does this image create?'], 'He writes of fog that swallows light.'),
    q('sp3-q5', 'Summarise the poem and its central mystery.', 'summarisation', 'The poem describes a lighthouse keeper who records storms and shipwrecks in his logbook. Locals believe he is a ghost because the lamp operates without anyone visible. The narrator has seen only his shadow and a waving hand, leaving it unclear whether the keeper is real or supernatural.', ['Who is the poem about? What do people think? What does the narrator see?', 'What is left unanswered?'], 'The entire poem.'),
  ]),

  // ── Persuasive, Level 1 ──
  seed('seed-persuasive-1', 'persuasive', 1, 'animals', [
    'Every school should have a pet. Having an animal in the classroom teaches children responsibility because they must remember to feed it, clean its home, and check it has fresh water every day.',
    'A class pet also helps children feel calm. Studies have shown that stroking a rabbit or watching fish swim can lower stress and help pupils concentrate better during lessons.',
    'Some people worry that pets in school could cause allergies. However, many animals such as fish, tortoises, and stick insects are unlikely to trigger allergic reactions and are easy to care for.',
    'In conclusion, a class pet brings joy, teaches important life skills, and can even improve learning. Schools that have tried it report happier, more engaged pupils. It is time for every school to give it a go.',
  ], [
    q('spe1-q1', 'Name two responsibilities children would have with a class pet.', 'retrieval', 'They must remember to feed it and clean its home (also acceptable: check it has fresh water).', ['Look at the first paragraph.', 'What tasks are mentioned?'], 'They must remember to feed it, clean its home, and check it has fresh water every day.'),
    q('spe1-q2', 'Why does the author mention fish, tortoises, and stick insects?', 'inference', 'The author mentions these animals to counter the allergy argument by showing that there are many pet options that do not cause allergic reactions, making the idea of a class pet more practical.', ['What concern is the author responding to?', 'Are these animals furry?'], 'Many animals such as fish, tortoises, and stick insects are unlikely to trigger allergic reactions.'),
    q('spe1-q3', 'What does "engaged" mean in the final paragraph?', 'vocabulary', 'Engaged means interested and involved in what is happening.', ['Think about pupils who are paying attention and taking part.', 'What is the opposite of bored or distracted?'], 'Schools that have tried it report happier, more engaged pupils.'),
    q('spe1-q4', 'Is this passage trying to inform you or persuade you? How can you tell?', 'authors-purpose', 'The passage is trying to persuade the reader. You can tell because it uses phrases like "every school should," gives reasons to support one side of the argument, addresses counter-arguments, and ends with a call to action ("It is time for every school to give it a go").', ['Look at the opening and closing sentences.', 'Does the author present both sides equally or favour one?'], 'Every school should have a pet. It is time for every school to give it a go.'),
    q('spe1-q5', 'Summarise the three main arguments the author makes for having a class pet.', 'summarisation', 'The author argues that class pets teach responsibility, help children feel calm and concentrate better, and that allergy concerns can be addressed by choosing suitable animals like fish or tortoises.', ['One argument per paragraph — what are they?', 'Think: responsibility, calmness, and allergies.'], 'The entire passage.'),
  ]),

  // ── Persuasive, Level 2 ──
  seed('seed-persuasive-2', 'persuasive', 2, 'adventure', [
    'Homework should be replaced with reading for pleasure. Every evening, thousands of children sit at kitchen tables completing worksheets that teach them very little, when they could be lost in a book that sparks their imagination and builds their vocabulary naturally.',
    'Research from the University of Oxford found that children who read for enjoyment for just thirty minutes a day made significantly more progress in English than those who completed traditional homework. Reading exposes children to complex sentence structures, varied vocabulary, and different perspectives — all without feeling like work.',
    'Critics argue that homework reinforces what is taught in class. While this may be true for subjects like mathematics, English homework often consists of repetitive exercises that fail to develop a genuine love of language. A child who reads willingly is far more likely to become a confident writer than one who fills in blanks on a worksheet.',
    'Schools should trust their pupils to choose books that interest them and allow reading to replace written English homework. The evidence is clear: pleasure reading produces better readers, better writers, and happier children.',
  ], [
    q('spe2-q1', 'What did the University of Oxford research find?', 'retrieval', 'Children who read for enjoyment for thirty minutes a day made significantly more progress in English than those who completed traditional homework.', ['Look at the second paragraph for the research finding.', 'What was compared — reading vs what?'], 'Children who read for enjoyment for just thirty minutes a day made significantly more progress in English than those who completed traditional homework.'),
    q('spe2-q2', 'Why does the author describe worksheets as teaching children "very little"?', 'inference', 'The author wants to make traditional homework seem ineffective compared to reading, strengthening the argument that reading is a better use of time. It is a deliberate choice of words to persuade the reader.', ['Is this a fact or an opinion?', 'What effect does this strong language have on the reader?'], 'Completing worksheets that teach them very little.'),
    q('spe2-q3', 'What does "reinforces" mean in "homework reinforces what is taught in class"?', 'vocabulary', 'Reinforces means strengthens or supports — in this case, it means homework helps pupils remember and practise what they learned in lessons.', ['Think about making something stronger.', 'What does homework do to classroom learning, according to critics?'], 'Critics argue that homework reinforces what is taught in class.'),
    q('spe2-q4', 'How does the author deal with the opposing argument about homework?', 'authors-purpose', 'The author acknowledges the opposing view ("While this may be true for subjects like mathematics") but then argues it does not apply to English homework specifically, dismissing it as "repetitive exercises." This technique is called a counter-argument.', ['Does the author ignore the other side or address it?', 'What technique is used to weaken the opposing view?'], 'While this may be true for subjects like mathematics, English homework often consists of repetitive exercises.'),
    q('spe2-q5', 'Summarise the author\'s argument in your own words.', 'summarisation', 'The author argues that reading for pleasure should replace English homework because research shows it is more effective, it builds vocabulary and imagination naturally, and traditional worksheets are repetitive and uninspiring.', ['What should replace homework? Why? What evidence is given?', 'Cover the main claim, the evidence, and the conclusion.'], 'The entire passage.'),
  ]),

  // ── Persuasive, Level 3 ──
  seed('seed-persuasive-3', 'persuasive', 3, 'adventure', [
    'The voting age in the United Kingdom should be lowered to sixteen. At sixteen, young people can leave school, join the armed forces with parental consent, pay taxes, and even get married — yet they are denied the right to have a say in how their country is governed. This inconsistency is both illogical and unjust.',
    'Opponents frequently claim that sixteen-year-olds lack the maturity to make informed political decisions. However, this argument conveniently ignores the fact that there is no maturity test for voters of any age. An uninformed forty-year-old has the same voting rights as a well-read professor. Maturity, therefore, is a flawed criterion for determining who should vote.',
    'Furthermore, lowering the voting age would invigorate democratic participation. Scotland allowed sixteen-year-olds to vote in the 2014 independence referendum, and turnout among that age group was seventy-five per cent — higher than the eighteen-to-twenty-four bracket in most general elections. Early engagement with democracy creates lifelong voters.',
    'The evidence from Scotland demonstrates that young people, when given the opportunity, participate enthusiastically and responsibly. Denying them the vote does not protect them; it silences them. A truly democratic society must include the voices of those whose futures are most at stake.',
  ], [
    q('spe3-q1', 'What was the voter turnout among sixteen-year-olds in the Scottish referendum?', 'retrieval', 'The turnout among sixteen-year-olds was seventy-five per cent.', ['Look at the third paragraph for a percentage.', 'Which country is mentioned as an example?'], 'Turnout among that age group was seventy-five per cent.'),
    q('spe3-q2', 'Why does the author mention that an "uninformed forty-year-old" can vote?', 'inference', 'The author uses this comparison to undermine the maturity argument — if there is no test of knowledge or maturity for adult voters, it is inconsistent to use maturity as a reason to exclude sixteen-year-olds.', ['What argument is the author responding to?', 'How does comparing adults and teenagers weaken the opposing view?'], 'An uninformed forty-year-old has the same voting rights as a well-read professor.'),
    q('spe3-q3', 'What does "invigorate" mean in the phrase "invigorate democratic participation"?', 'vocabulary', 'Invigorate means to give energy and enthusiasm to something — in this case, to make more people excited about taking part in democracy.', ['Think of a word that means "energise" or "refresh".', 'What effect would lowering the voting age have on democracy, according to the author?'], 'Lowering the voting age would invigorate democratic participation.'),
    q('spe3-q4', 'What persuasive technique does the author use in the final sentence?', 'authors-purpose', 'The author uses emotive language ("silences them") and an appeal to values ("A truly democratic society must include the voices of those whose futures are most at stake") to make the reader feel that excluding young voters is morally wrong.', ['Is the final sentence factual or emotional?', 'What feelings does "silences them" create?'], 'Denying them the vote does not protect them; it silences them. A truly democratic society must include the voices of those whose futures are most at stake.'),
    q('spe3-q5', 'Summarise the author\'s argument and the evidence they use.', 'summarisation', 'The author argues the UK voting age should be lowered to sixteen because sixteen-year-olds already have adult responsibilities, the maturity argument is flawed since no voter faces a maturity test, and Scotland\'s referendum showed high turnout and responsible participation among young voters.', ['What is the main claim? What are the three supporting points?', 'Include the Scottish evidence.'], 'The entire passage.'),
  ]),

  // ── Additional Fiction, Level 1 (2nd) ──
  seed('seed-fiction-1b', 'fiction', 1, 'animals', [
    'The fox cub poked its nose out of the den and sniffed the cold morning air. Frost covered the meadow like a white blanket. Somewhere nearby, a robin was singing its first song of the day.',
    'The cub\'s mother nudged it gently forward. It was time to learn how to hunt. The cub crept low through the grass, copying its mother\'s every move, ears flat against its head.',
    'A field mouse darted between the stalks. The cub pounced — and missed, tumbling head over paws into a patch of nettles. Its mother watched patiently, her amber eyes warm with something that looked very much like a smile.',
    'By the end of the morning, the cub had caught nothing but a mouthful of mud. But it had learned to move quietly, to listen carefully, and to try again without giving up. Those, its mother knew, were the most important lessons of all.',
  ], [
    q('sf1b-q1', 'What covered the meadow?', 'retrieval', 'Frost covered the meadow like a white blanket.', ['Look at the first paragraph.', 'What made the meadow white?'], 'Frost covered the meadow like a white blanket.'),
    q('sf1b-q2', 'Why do you think the mother fox watched "patiently" when the cub missed?', 'inference', 'She was patient because she understood that learning takes time and mistakes are part of the process. She wanted the cub to keep trying rather than feel discouraged.', ['How would you feel if someone got frustrated with you for making a mistake?', 'What kind of teacher is the mother fox?'], 'Its mother watched patiently, her amber eyes warm with something that looked very much like a smile.'),
    q('sf1b-q3', 'What does "darted" mean in "A field mouse darted between the stalks"?', 'vocabulary', 'Darted means moved suddenly and quickly in a particular direction.', ['Think about how a mouse moves when it is scared.', 'Is the mouse moving slowly or fast?'], 'A field mouse darted between the stalks.'),
    q('sf1b-q4', 'What is the main message of this story?', 'summarisation', 'The story is about a young fox learning to hunt. Although it fails to catch anything, it learns important skills like moving quietly and not giving up. The message is that practice and persistence matter more than immediate success.', ['What did the cub actually learn?', 'Did it need to catch something to have a successful day?'], 'The entire passage.'),
  ]),

  // ── Additional Fiction, Level 1 (3rd) ──
  seed('seed-fiction-1c', 'fiction', 1, 'mystery', [
    'Zara found the note tucked inside her library book. It was written in neat blue ink on a square of yellow paper: "Look under the third bench in the park. Bring a torch."',
    'After school, she walked to the park with her best friend, Kofi. They counted the benches along the path — one, two, three. Under the third bench, taped to the underside of the seat, was a small wooden box.',
    'Inside the box was a brass key and another note: "This key opens something wonderful. Follow the path to the old bandstand." Zara and Kofi looked at each other, eyes wide with excitement.',
    'At the bandstand, they found a padlocked cupboard built into the base. The key fitted perfectly. Inside were dozens of handmade bookmarks, each one decorated with a tiny painting and a message: "A book is a door. Keep reading." They never found out who left them, but they kept every single one.',
  ], [
    q('sf1c-q1', 'Where did Zara find the first note?', 'retrieval', 'She found it tucked inside her library book.', ['Look at the very first sentence.', 'Where was the note hidden?'], 'Zara found the note tucked inside her library book.'),
    q('sf1c-q2', 'Why do you think the mystery person left the bookmarks?', 'inference', 'The person probably wanted to encourage children to read by creating an exciting treasure hunt that ended with a message about the joy of books. They wanted reading to feel like an adventure.', ['What was the message on the bookmarks?', 'Why make it a treasure hunt instead of just giving them out?'], 'Each one decorated with a tiny painting and a message: "A book is a door. Keep reading."'),
    q('sf1c-q3', 'What does "padlocked" mean?', 'vocabulary', 'Padlocked means secured or locked with a padlock — a detachable lock that hangs from a metal loop.', ['Think about what you need a key to open.', 'What kind of lock can you remove completely?'], 'They found a padlocked cupboard built into the base.'),
    q('sf1c-q4', 'Why did the author choose to end the story without revealing who left the notes?', 'authors-purpose', 'The author left the identity a mystery to preserve the sense of wonder and magic. Knowing who did it would make it ordinary — keeping it unknown makes the experience feel special and encourages the reader to imagine.', ['How would the ending feel different if they found out who it was?', 'Does the mystery make the story better or worse?'], 'They never found out who left them, but they kept every single one.'),
    q('sf1c-q5', 'Summarise what happens in this story.', 'summarisation', 'Zara finds a mysterious note in a library book leading her and her friend Kofi on a treasure hunt through the park. They follow clues to a bandstand where they discover handmade bookmarks with encouraging messages about reading. The person who left them is never identified.', ['What are the three main stages of the story?', 'Beginning: the note. Middle: the hunt. End: the discovery.'], 'The entire passage.'),
  ]),

  // ── Additional Non-fiction, Level 1 (2nd) ──
  seed('seed-nonfiction-1b', 'non-fiction', 1, 'space', [
    'The Moon is Earth\'s closest neighbour in space. It is about 384,400 kilometres away — so far that it takes light just over one second to travel from the Moon to Earth. If you could drive a car to the Moon at motorway speed, the journey would take about six months.',
    'The Moon does not make its own light. What we see as moonlight is actually sunlight bouncing off the Moon\'s surface. The surface is covered in grey dust and rocks, and it is marked with thousands of craters made by space rocks crashing into it over billions of years.',
    'Humans first walked on the Moon on 20 July 1969. The astronaut Neil Armstrong was the first person to step onto the surface. He said the famous words: "That\'s one small step for man, one giant leap for mankind."',
    'The Moon affects life on Earth in important ways. Its gravity pulls on the oceans, creating the tides that rise and fall twice each day. Without the Moon, our days would be much shorter and the weather would be far more extreme.',
  ], [
    q('snf1b-q1', 'How far away is the Moon from Earth?', 'retrieval', 'The Moon is about 384,400 kilometres away.', ['Look at the first paragraph for a number.', 'The distance is given in kilometres.'], 'It is about 384,400 kilometres away.'),
    q('snf1b-q2', 'Why does the author compare the journey to driving a car?', 'authors-purpose', 'The author uses this comparison to help the reader understand how far away the Moon really is, since most people can imagine a long car journey but cannot easily picture 384,400 kilometres.', ['Does the comparison make the distance easier to understand?', 'Why use something familiar like a car?'], 'If you could drive a car to the Moon at motorway speed, the journey would take about six months.'),
    q('snf1b-q3', 'What are craters?', 'vocabulary', 'Craters are bowl-shaped holes in the surface of the Moon (or other planets) made by space rocks crashing into it.', ['The passage explains what made them.', 'What shape would a rock make if it hit soft ground very hard?'], 'It is marked with thousands of craters made by space rocks crashing into it over billions of years.'),
    q('snf1b-q4', 'Summarise the four main facts about the Moon from this passage.', 'summarisation', 'The Moon is 384,400 km from Earth. Its light is reflected sunlight and its surface is covered in dust, rocks, and craters. Humans first walked on it in 1969. The Moon\'s gravity creates Earth\'s tides and stabilises our climate.', ['One fact per paragraph.', 'Cover distance, surface, humans, and tides.'], 'The entire passage.'),
  ]),

  // ── Additional Non-fiction, Level 1 (3rd) ──
  seed('seed-nonfiction-1c', 'non-fiction', 1, 'animals', [
    'Honeybees are some of the hardest-working creatures on the planet. A single bee visits between fifty and a thousand flowers in one trip, collecting a sticky substance called nectar. It takes about two million flower visits to make just one jar of honey.',
    'Inside the hive, bees have different jobs depending on their age. Young bees clean the cells and feed the larvae. Older bees build the honeycomb from wax that they produce from glands on their bodies. The oldest bees are the foragers who fly out to find food.',
    'Bees communicate by dancing. When a forager finds a good source of nectar, it returns to the hive and performs a "waggle dance" that tells the other bees exactly which direction to fly and how far away the flowers are.',
    'Bees are vital to humans because they pollinate the plants that produce much of our food. Without bees, we would lose apples, strawberries, almonds, and many other crops. Scientists are working hard to protect bee populations, which have been declining in recent years.',
  ], [
    q('snf1c-q1', 'How many flower visits does it take to make one jar of honey?', 'retrieval', 'It takes about two million flower visits.', ['Look for a large number in the first paragraph.', 'The answer is in the millions.'], 'It takes about two million flower visits to make just one jar of honey.'),
    q('snf1c-q2', 'Why do you think the author describes the waggle dance?', 'inference', 'The author includes this detail because it is surprising and fascinating — most people would not expect insects to communicate through dance. It demonstrates how intelligent and organised bees are.', ['Is this an ordinary or surprising fact?', 'What does it show about bees?'], 'It performs a "waggle dance" that tells the other bees exactly which direction to fly and how far away the flowers are.'),
    q('snf1c-q3', 'What does "pollinate" mean?', 'vocabulary', 'Pollinate means to transfer pollen from one flower to another, which allows the plant to produce fruit and seeds. Bees do this as they move between flowers collecting nectar.', ['Think about what bees do when they land on flowers.', 'What do plants need to produce fruit?'], 'They pollinate the plants that produce much of our food.'),
    q('snf1c-q4', 'Summarise the key facts about honeybees from this passage.', 'summarisation', 'Honeybees visit millions of flowers to make honey. They have age-based jobs in the hive including cleaning, building, and foraging. They communicate through a waggle dance. They are vital for pollinating food crops but their populations are declining.', ['One main point per paragraph.', 'Cover honey-making, jobs, communication, and importance.'], 'The entire passage.'),
  ]),
];
