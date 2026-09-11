import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Exercise from './models/Exercise';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kaizen_db';

export const COMPREHENSIVE_EXERCISES = [
  // --- CHEST ---
  {
    name: 'Barbell Flat Bench Press',
    targetMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: 'Lie on bench, grip bar slightly wider than shoulder width. Lower bar smoothly to mid-chest, press up explosively while keeping shoulder blades retracted.',
    gifUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80',
  },
  {
    name: 'Incline Dumbbell Press',
    targetMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    instructions: 'Set bench to 30-45 degrees. Press dumbbells upwards in a slight arc without banging them at the top. Emphasizes upper clavicular pectorals.',
    gifUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&q=80',
  },
  {
    name: 'Decline Barbell Bench Press',
    targetMuscle: 'chest',
    secondaryMuscles: ['triceps'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: 'Secure legs at decline bench. Lower bar under control to lower chest, press upwards to target sternal pectoralis major.',
  },
  {
    name: 'Cable Chest Flye / Crossover',
    targetMuscle: 'chest',
    secondaryMuscles: ['shoulders'],
    equipment: 'cable',
    difficulty: 'beginner',
    instructions: 'Stand centered between dual pulleys. Bring hands together in hugging motion, squeezing pecs at peak contraction for continuous tension.',
  },
  {
    name: 'Pec Deck Machine Flye',
    targetMuscle: 'chest',
    secondaryMuscles: ['shoulders'],
    equipment: 'machine',
    difficulty: 'beginner',
    instructions: 'Sit with back flush against pad. Adjust handles to chest height. Squeeze elbows and handles together in controlled motion.',
  },
  {
    name: 'Dips (Chest Focus)',
    targetMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: 'Lean torso forward roughly 30 degrees with elbows slightly flared. Lower until comfortable chest stretch, press back up.',
  },
  {
    name: 'Push-Ups (Standard / Deficit)',
    targetMuscle: 'chest',
    secondaryMuscles: ['core', 'triceps'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: 'Keep rigid plank posture. Lower chest to floor, push through full range of motion with elbows at a 45-degree angle.',
  },
  {
    name: 'Dumbbell Pullover',
    targetMuscle: 'chest',
    secondaryMuscles: ['back', 'triceps'],
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    instructions: 'Lie perpendicular across bench. Lower dumbbell in arc over head to stretch ribcage and pecs, pull back to eye level.',
  },

  // --- BACK ---
  {
    name: 'Conventional Barbell Deadlift',
    targetMuscle: 'back',
    secondaryMuscles: ['legs', 'core'],
    equipment: 'barbell',
    difficulty: 'advanced',
    instructions: 'Stand mid-foot under bar. Hinge hips back, brace core, pull slack from bar, and drive through floor to full hip extension.',
  },
  {
    name: 'Barbell Bent-Over Row',
    targetMuscle: 'back',
    secondaryMuscles: ['biceps', 'core'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: 'Hinge forward at 45 degrees with flat back. Pull bar towards lower ribcage, driving elbows past torso.',
  },
  {
    name: 'Lat Pulldown (Wide Grip)',
    targetMuscle: 'back',
    secondaryMuscles: ['biceps'],
    equipment: 'cable',
    difficulty: 'beginner',
    instructions: 'Grip bar slightly outside shoulder width. Pull bar straight down to collarbone while driving elbows down into back pockets.',
  },
  {
    name: 'Pull-Ups / Chin-Ups',
    targetMuscle: 'back',
    secondaryMuscles: ['biceps', 'core'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: 'Hang from overhead bar. Pull chest to bar until chin clears bar. Lower under strict eccentric control without swinging.',
  },
  {
    name: 'Seated Cable Row',
    targetMuscle: 'back',
    secondaryMuscles: ['biceps', 'shoulders'],
    equipment: 'cable',
    difficulty: 'beginner',
    instructions: 'Sit upright with neutral spine. Pull handle towards navel, squeezing rhomboids and latissimus dorsi at contraction.',
  },
  {
    name: 'One-Arm Dumbbell Row',
    targetMuscle: 'back',
    secondaryMuscles: ['biceps'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions: 'Place knee and hand on flat bench. Pull dumbbell vertically towards hip crease, maintaining square shoulders.',
  },
  {
    name: 'T-Bar Chest Supported Row',
    targetMuscle: 'back',
    secondaryMuscles: ['biceps'],
    equipment: 'machine',
    difficulty: 'intermediate',
    instructions: 'Rest chest on support pad. Pull handles upwards with neutral grip to isolate mid-back without lower back fatigue.',
  },
  {
    name: 'Straight-Arm Cable Lat Pulldown',
    targetMuscle: 'back',
    secondaryMuscles: ['core'],
    equipment: 'cable',
    difficulty: 'beginner',
    instructions: 'Stand with arms extended holding cable bar. Press bar downwards in arc to hips using strictly lat activation.',
  },
  {
    name: 'Face Pulls (Rope Cable)',
    targetMuscle: 'back',
    secondaryMuscles: ['shoulders'],
    equipment: 'cable',
    difficulty: 'beginner',
    instructions: 'Set pulley to upper chest height. Pull rope towards bridge of nose while externally rotating shoulders for rotator cuff health.',
  },

  // --- LEGS ---
  {
    name: 'Barbell Back Squat',
    targetMuscle: 'legs',
    secondaryMuscles: ['core', 'back'],
    equipment: 'barbell',
    difficulty: 'advanced',
    instructions: 'Rest bar across traps. Brace core 360 degrees. Descend hips back and knees out until thighs are parallel or below, drive up through mid-foot.',
  },
  {
    name: 'Front Squat',
    targetMuscle: 'legs',
    secondaryMuscles: ['core'],
    equipment: 'barbell',
    difficulty: 'advanced',
    instructions: 'Clean bar onto front deltoid shelf. Maintain tall upright torso, squat deeply with high elbows emphasizing quadriceps.',
  },
  {
    name: 'Romanian Deadlift (RDL)',
    targetMuscle: 'legs',
    secondaryMuscles: ['back', 'core'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: 'Slight knee bend. Hinge hips backward as far as possible until hamstring tension peaks, squeeze glutes to return to standing.',
  },
  {
    name: 'Leg Press (45 Degree)',
    targetMuscle: 'legs',
    secondaryMuscles: ['core'],
    equipment: 'machine',
    difficulty: 'beginner',
    instructions: 'Place feet shoulder-width on platform. Lower sled until knees reach 90 degrees without rounding lower back off pad.',
  },
  {
    name: 'Bulgarian Split Squat',
    targetMuscle: 'legs',
    secondaryMuscles: ['core'],
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    instructions: 'Elevate rear foot on bench. Descend front knee until rear knee hovers above floor. Tremendous unilateral quad and glute stimulus.',
  },
  {
    name: 'Walking Dumbbell Lunges',
    targetMuscle: 'legs',
    secondaryMuscles: ['core'],
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    instructions: 'Take deliberate steps forward, lowering trailing knee to gentle floor brush before driving forward through lead heel.',
  },
  {
    name: 'Leg Extension Machine',
    targetMuscle: 'legs',
    secondaryMuscles: [],
    equipment: 'machine',
    difficulty: 'beginner',
    instructions: 'Align knee joint with machine axis. Extend legs to peak quad contraction, pausing 1 second at top before lowering smoothly.',
  },
  {
    name: 'Lying Hamstring Leg Curl',
    targetMuscle: 'legs',
    secondaryMuscles: [],
    equipment: 'machine',
    difficulty: 'beginner',
    instructions: 'Lie prone with pad behind ankles. Curl heels toward glutes, focusing on pure biceps femoris contraction.',
  },
  {
    name: 'Standing Calf Raise',
    targetMuscle: 'legs',
    secondaryMuscles: [],
    equipment: 'machine',
    difficulty: 'beginner',
    instructions: 'Balls of feet on step edge. Lower heels into deep calf stretch, push through big toes to peak plantarflexion.',
  },
  {
    name: 'Barbell Hip Thrust',
    targetMuscle: 'legs',
    secondaryMuscles: ['core'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: 'Upper back resting on bench with padded bar over hips. Drive hips to ceiling, fully locking out glutes at top parallel.',
  },

  // --- SHOULDERS ---
  {
    name: 'Standing Overhead Barbell Press (OHP)',
    targetMuscle: 'shoulders',
    secondaryMuscles: ['triceps', 'core'],
    equipment: 'barbell',
    difficulty: 'advanced',
    instructions: 'Grip bar at collarbone. Tighten glutes and abs. Press bar vertically overhead in straight path, tilting head out of the way.',
  },
  {
    name: 'Seated Dumbbell Shoulder Press',
    targetMuscle: 'shoulders',
    secondaryMuscles: ['triceps'],
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    instructions: 'Sit on vertical bench. Press dumbbells overhead in controlled motion, stopping just short of locking elbows.',
  },
  {
    name: 'Dumbbell Lateral Raise',
    targetMuscle: 'shoulders',
    secondaryMuscles: [],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions: 'Lead with elbows with slight forward lean. Raise dumbbells to shoulder height, pouring out like a pitcher to blast lateral delts.',
  },
  {
    name: 'Cable Lateral Raise',
    targetMuscle: 'shoulders',
    secondaryMuscles: [],
    equipment: 'cable',
    difficulty: 'beginner',
    instructions: 'Set pulley low, raise handle diagonally across body. Constant cable tension through bottom third of motion.',
  },
  {
    name: 'Arnold Dumbbell Press',
    targetMuscle: 'shoulders',
    secondaryMuscles: ['triceps'],
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    instructions: 'Start with palms facing chest. Rotate palms outward as you press overhead, engaging anterior and lateral deltoid fibers.',
  },
  {
    name: 'Bent-Over Rear Delt Flyes',
    targetMuscle: 'shoulders',
    secondaryMuscles: ['back'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions: 'Hinge torso forward horizontally. Raise dumbbells outward like wings, focusing on posterior deltoid squeeze.',
  },
  {
    name: 'Dumbbell Front Raise',
    targetMuscle: 'shoulders',
    secondaryMuscles: ['chest'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions: 'Raise dumbbells one or both at a time forward to eye level with pronated or hammer grip.',
  },

  // --- BICEPS ---
  {
    name: 'Standing Barbell Bicep Curl',
    targetMuscle: 'biceps',
    secondaryMuscles: [],
    equipment: 'barbell',
    difficulty: 'beginner',
    instructions: 'Supinated grip shoulder-width. Keep elbows pinned to ribs, curl bar towards chest without hip swinging.',
  },
  {
    name: 'Incline Dumbbell Curl',
    targetMuscle: 'biceps',
    secondaryMuscles: [],
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    instructions: 'Sit on 45-degree incline bench. Full deep bicep stretch at bottom, curl upward with forearm supination.',
  },
  {
    name: 'Dumbbell Hammer Curl',
    targetMuscle: 'biceps',
    secondaryMuscles: [],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions: 'Maintain neutral thumbs-up grip throughout. Highly targets brachialis and brachioradialis for arm thickness.',
  },
  {
    name: 'Preacher Curl (EZ-Bar)',
    targetMuscle: 'biceps',
    secondaryMuscles: [],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: 'Rest armpits over preacher bench pad. Eliminates all body momentum, isolating the lower bicep peak.',
  },
  {
    name: 'Cable Rope Bicep Curl',
    targetMuscle: 'biceps',
    secondaryMuscles: [],
    equipment: 'cable',
    difficulty: 'beginner',
    instructions: 'Attach rope to low pulley. Curl up and spread rope apart at top for peak contraction.',
  },
  {
    name: 'Concentration Curl',
    targetMuscle: 'biceps',
    secondaryMuscles: [],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions: 'Sit on bench, wedge elbow against inner thigh. Curl dumbbell smoothly with zero torso rotation.',
  },

  // --- TRICEPS ---
  {
    name: 'Cable Tricep Rope Pushdown',
    targetMuscle: 'triceps',
    secondaryMuscles: [],
    equipment: 'cable',
    difficulty: 'beginner',
    instructions: 'Pin elbows beside torso. Push rope down, flaring ends outward at bottom for lateral tricep head burnout.',
  },
  {
    name: 'EZ-Bar Skull Crushers (Lying Tricep Ext)',
    targetMuscle: 'triceps',
    secondaryMuscles: [],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: 'Lie on flat bench, arms extended overhead at slight backward angle. Bend at elbows to lower bar towards forehead or crown.',
  },
  {
    name: 'Overhead Dumbbell Tricep Extension',
    targetMuscle: 'triceps',
    secondaryMuscles: [],
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    instructions: 'Hold single dumbbell with both hands overhead. Lower behind neck to stretch the long head of the tricep, extend upward.',
  },
  {
    name: 'Close-Grip Barbell Bench Press',
    targetMuscle: 'triceps',
    secondaryMuscles: ['chest', 'shoulders'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: 'Grip bar with hands shoulder-width apart. Keep elbows tucked close to body as you press.',
  },
  {
    name: 'Bench Dips',
    targetMuscle: 'triceps',
    secondaryMuscles: ['chest'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: 'Hands placed behind on edge of bench, feet extended. Lower hips towards floor, press through palms.',
  },

  // --- CORE ---
  {
    name: 'Hanging Leg / Knee Raise',
    targetMuscle: 'core',
    secondaryMuscles: [],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: 'Hang from pull-up bar. Flex abs and raise knees or toes to bar height without excessive swinging.',
  },
  {
    name: 'Kneeling Cable Crunch',
    targetMuscle: 'core',
    secondaryMuscles: [],
    equipment: 'cable',
    difficulty: 'intermediate',
    instructions: 'Kneel holding rope beside head. Curl ribcage toward pelvis, crunching abs under heavy cable resistance.',
  },
  {
    name: 'Ab Wheel Rollout',
    targetMuscle: 'core',
    secondaryMuscles: ['back', 'shoulders'],
    equipment: 'other',
    difficulty: 'advanced',
    instructions: 'Kneel with ab wheel. Roll forward under strict pelvic tilt and abdominal control, pull back using core power.',
  },
  {
    name: 'Standard Forearm Plank',
    targetMuscle: 'core',
    secondaryMuscles: ['shoulders'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: 'Hold straight line from head to heels. Squeeze glutes and abs to resist spinal extension.',
  },
  {
    name: 'Russian Twists',
    targetMuscle: 'core',
    secondaryMuscles: [],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions: 'Sit in V-shape with feet elevated. Rotate dumbbell from side to side across hip line targeting obliques.',
  },
  {
    name: 'Pallof Press',
    targetMuscle: 'core',
    secondaryMuscles: ['shoulders'],
    equipment: 'cable',
    difficulty: 'beginner',
    instructions: 'Stand perpendicular to cable pulley. Press handle straight out in front of chest, resisting rotational torque.',
  },
  {
    name: 'Dumbbell Floor Press',
    targetMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions: 'Lie flat on floor with knees bent. Press dumbbells up over chest; lower until upper arms gently touch floor, eliminating shoulder strain.',
  },
  {
    name: 'Dumbbell Floor Chest Flye',
    targetMuscle: 'chest',
    secondaryMuscles: ['shoulders'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions: 'Lie on floor with slight bend in elbows. Lower dumbbells out in an arc until back of arms touch floor, flye back to center.',
  },
  {
    name: 'Push-Up to Renegade Row',
    targetMuscle: 'chest',
    secondaryMuscles: ['back', 'core', 'triceps'],
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    instructions: 'Plank on dumbbells. Perform a full push-up, then row one dumbbell to your hip pocket while maintaining level hips. Alternate sides.',
  },
  {
    name: 'Deficit Push-Ups',
    targetMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'other',
    difficulty: 'intermediate',
    instructions: 'Grip push-up handles or blocks. Lower chest below hand level for extended range of motion and maximal pectoral stretch.',
  },
  {
    name: 'Diamond Push-Ups',
    targetMuscle: 'triceps',
    secondaryMuscles: ['chest', 'shoulders'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: 'Hands under chest with thumbs and index fingers touching in diamond shape. Lower chest to hands with elbows tucked tight.',
  },
  {
    name: 'Pike Push-Ups',
    targetMuscle: 'shoulders',
    secondaryMuscles: ['triceps', 'core'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: 'Pike hips high in inverted V. Lower crown of head forward toward floor between hands; press floor away back to piked lockout.',
  },
  {
    name: 'Standing Dumbbell Shoulder Press',
    targetMuscle: 'shoulders',
    secondaryMuscles: ['triceps', 'core'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions: 'Stand tall with core braced. Press dumbbells vertically overhead to full arm extension without overarching lower back.',
  },
  {
    name: 'Standing Dumbbell Bicep Curl',
    targetMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions: 'Stand feet shoulder-width. Curl dumbbells while rotating wrists outward (supination) to achieve maximum bicep peak contraction.',
  },
  {
    name: 'Dumbbell Goblet Squat',
    targetMuscle: 'legs',
    secondaryMuscles: ['core'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions: 'Cup dumbbell vertically against chest. Squat deeply between knees with upright torso and flat back; drive through mid-foot.',
  },
  {
    name: 'Dumbbell Romanian Deadlift (RDL)',
    targetMuscle: 'legs',
    secondaryMuscles: ['back', 'core'],
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    instructions: 'Hold dumbbells against thighs. Hinge hips straight back with soft knees, feel deep stretch in hamstrings, drive hips forward.',
  },
  {
    name: 'Bodyweight Air Squat',
    targetMuscle: 'legs',
    secondaryMuscles: ['core'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: 'Feet shoulder-width apart. Squat back and down until hip crease is below knee height; keep chest tall and arms forward for balance.',
  },
  {
    name: 'Dumbbell Standing Calf Raise',
    targetMuscle: 'legs',
    secondaryMuscles: ['forearms'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions: 'Hold dumbbells at sides with toes on a slight elevation. Lower heels deep, explode up onto big toes and hold peak contraction.',
  },
  {
    name: 'Deadbug (Core Stability)',
    targetMuscle: 'core',
    secondaryMuscles: [],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: 'Lie flat on back with lumbar spine pinned to floor. Extend opposite arm and leg simultaneously without arching back.',
  },
  {
    name: 'Dumbbell Bent-Over Row',
    targetMuscle: 'back',
    secondaryMuscles: ['biceps', 'core'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions: 'Hinge hips back at 45 degrees. Pull dumbbells towards hips, driving elbows back to recruit lats and middle trapezius.',
  },
  {
    name: 'Dumbbell Shrugs',
    targetMuscle: 'back',
    secondaryMuscles: ['forearms'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions: 'Hold heavy dumbbells at sides. Elevate shoulders vertically toward ears, pausing for a 1-second squeeze at top.',
  },
  {
    name: 'Dumbbell Tricep Kickbacks',
    targetMuscle: 'triceps',
    secondaryMuscles: [],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions: 'Hinge forward with upper arm pinned parallel to torso. Extend forearm back to lock out triceps under control.',
  },
];

async function seed() {
  try {
    console.log(`[Exercise Seeder] Connecting to ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('[Exercise Seeder] Connected to MongoDB.');

    let inserted = 0;
    let skipped = 0;

    for (const ex of COMPREHENSIVE_EXERCISES) {
      const existing = await Exercise.findOne({ name: ex.name, userId: null });
      if (!existing) {
        await Exercise.create({
          ...ex,
          userId: null,
        });
        inserted++;
      } else {
        skipped++;
      }
    }

    console.log(`[Exercise Seeder] Done! Seeded ${inserted} new exercises (${skipped} already existed). Total catalog: ${await Exercise.countDocuments()}`);
    process.exit(0);
  } catch (err) {
    console.error('[Exercise Seeder Error]:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  seed();
}
