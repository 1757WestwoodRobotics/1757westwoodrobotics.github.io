export interface RobotVideo {
	name: string;
	youtubeId: string;
}

export interface RobotAward {
	name: string;
	event: string;
}

export interface RobotSpecs {
	drivetrain?: string;
	weight?: string;
	dimensions?: string;
	primaryMechanism?: string;
	motorTypes?: string;
	programmingLanguage?: string;
	notableFeatures?: string[];
}

export interface FRCGame {
	name: string;
	description: string;
	logoPath: string;
	revealVideoId: string;
}

export interface CompetitionResult {
	event: string;
	qualRecord?: string;
	elimResult?: string;
	rank?: string;
}

export interface Robot {
	slug: string;
	name: string;
	year: number;
	image: string;
	description: string;
	game?: FRCGame;
	techbinder?: string;
	videos?: RobotVideo[];
	awards?: RobotAward[];
	specs?: RobotSpecs;
	galleryImages?: string[];
	narrative?: string;
	competitionResults?: CompetitionResult[];
	isOffseason?: boolean;
}

export const robots: Robot[] = [
	{
		slug: 'orion-2026',
		name: 'Orion',
		year: 2026,
		image: '/img/robots/2026rebuilt.png',
		description: "Named after the great hunter of Greek mythology — immortalized in the stars for his extraordinary precision — Orion is the spiritual successor to Skadi, our 2022 robot. Both hunters, both built around precision shooting, separated by four years of refinement. In REBUILT, where the Hub doesn't forgive imprecision and accuracy compounds into ranking points, Orion was designed to be the most consistent and accurate Fuel scorer we could build.",
		game: {
			name: 'REBUILT',
			description: 'In this archaeology-themed game, alliances of three robots score Fuel (foam balls) into a central Hub and climb a multi-level Tower at match end. Ranking points are earned for scoring thresholds (Energized at 100, Supercharged at 360) and combined climb height (Traversal).',
			logoPath: '/img/games/2026-rebuilt.png',
			revealVideoId: '_fybREErgyM'
		},
		techbinder: '/2026techbinder.pdf',
		videos: [],
		awards: [],
		specs: {
			drivetrain: 'Swerve (SDS MK5i)',
			weight: '~140 lbs (with battery and bumpers)',
			primaryMechanism: 'Turreted flywheel shooter with spindexer-fed kicker indexer',
			motorTypes: '18 TalonFX total: 7× Kraken X60, 6× Kraken X44, 5× Falcon 500',
			programmingLanguage: 'Python (RoboPy)',
			notableFeatures: [
				'270° turret with camera-on-turret for shoot-on-the-move capability',
				'Spindexer + dual-kicker indexer (4 motors) for continuous ball throughput',
				'Retractable full-width roller intake with turret collision interlock',
				'Variable-angle hood shooter (37° range) with operator trim adjustment',
				'Turret-mounted ThriftyCam with PhotonVision for persistent hub tracking',
				'8-state LED driver communication system with hub-shift warnings',
				'Winch climber targeting Level 2 (2.1× safety factor)',
				'Most motor-intensive robot in team history (18 TalonFX controllers)',
				'Upgraded to SDS MK5i swerve modules (all-gear, no belts)',
				'Dual CAN bus architecture (CANivore for drive, roboRIO for mechanisms)'
			]
		},
		competitionResults: [
			{ event: 'URI District Event', qualRecord: '6-6-0', rank: 'Ranked 19th' },
			{ event: 'WPI District Event', qualRecord: '3-9-0', rank: 'Ranked 29th' }
		],
		galleryImages: []
	},
	{
		slug: 'perseus-2025',
		name: 'Perseus',
		year: 2025,
		image: '/img/robots/2025reefscape.png',
		description: "Learning from the previous year's design mistakes, we set out to build a more robust and higher performing robot. Named after the Greek hero who slew Medusa, this bot is designed to be a versatile and reliable performer on the field. With a focus on durability and ease of maintenance, Perseus is built to withstand the rigors of competition while delivering consistent performance.",
		game: {
			name: 'REEFSCAPE',
			description: 'Robots score coral-shaped PVC pipes and rubber balls called Algae onto a reef structure on their side of the field. At the end of the match, robots climb metal cages hanging from a truss called the Barge for bonus points.',
			logoPath: '/img/games/2025-reefscape.png',
			revealVideoId: 'YWbxcjlY9JY'
		},
		techbinder: '/2025techbinder.pdf',
		videos: [
			{ name: 'Robot Reveal', youtubeId: '8KiZ2uVPwyY' },
			{ name: 'WPI Recap', youtubeId: '9QMI3LTphhM' }
		],
		awards: [
			{ name: 'FIRST Impact Award', event: 'URI District Event' }
		],
		specs: {
			drivetrain: 'Swerve (SDS MK4i)',
			programmingLanguage: 'Python (RoboPy)',
			primaryMechanism: 'Side-mounted elevator with friction-wheel coral intake',
			notableFeatures: [
				'Deliberately excluded algae mechanism for specialization',
				'Outward-facing climber opposite the elevator',
				'Designed for durability and ease of maintenance'
			]
		},
		competitionResults: [
			{ event: 'URI District Event', qualRecord: '6-6-0', rank: 'Ranked 22nd' },
			{ event: 'WPI District Event', qualRecord: '8-4-0', rank: 'Ranked 11th' },
			{ event: 'NE District Championship', qualRecord: '5-7-0' }
		],
		galleryImages: [
			'/img/gallery/2025/695840_55c94ea4eb624020b8d0af97f87f297d~mv2.webp',
			'/img/gallery/2025/DCMPcrowdcheer1.webp',
			'/img/gallery/2025/DCMPcrowdcheer2.webp',
			'/img/gallery/2025/DCMPfield1.webp',
			'/img/gallery/2025/DCMPpits.webp',
			'/img/gallery/2025/DCMPscoring2.webp',
			'/img/gallery/2025/MAstatesrobot1.webp',
			'/img/gallery/2025/NEDCMPscoring2.webp'
		]
	},
	{
		slug: 'proteus-2024',
		name: 'Proteus',
		year: 2024,
		image: '/img/robots/2024crescendo.png',
		description: 'Desiring and stretching to move further, team 1757 designed and built its most ambitious robot to date. Named after the Greek sea god who could change his shape at will, this bot is designed to be a versatile and adaptable performer on the field. Tragically this robot was never able to compete at its highest level due to time and resource constraints.',
		game: {
			name: 'CRESCENDO',
			description: 'In this music-themed game, robots collect foam rings called Notes and shoot them into a Speaker or place them in an Amp. At match end, robots climb chains on Stage structures for bonus points.',
			logoPath: '/img/games/2024-crescendo.svg',
			revealVideoId: '9keeDyFxzY4'
		},
		techbinder: '/2024techbinder.pdf',
		videos: [
			{ name: 'Behind The Bumpers', youtubeId: '9nz4GVGqrWM' },
			{ name: 'Riverrage Recap', youtubeId: 'S-tVF1yQD2U' }
		],
		awards: [
			{ name: 'FIRST Impact Award', event: 'Bridgewater-Raynham District Event' }
		],
		specs: {
			drivetrain: 'Swerve (SDS MK4i)',
			programmingLanguage: 'Python (RoboPy)',
			primaryMechanism: 'Side elevator with 4-bar intake and fixed side shooter',
			notableFeatures: [
				'3538-inspired side elevator design',
				'Linear slides instead of elevator blocks',
				'Fixed side shooter for rigidity (6328/3255-style)'
			]
		},
		competitionResults: [
			{ event: 'Bridgewater-Raynham District Event', qualRecord: '5-7-0', rank: 'Ranked 28th' },
			{ event: 'WPI District Event', qualRecord: '7-5-0', rank: 'Ranked 18th' }
		],
		galleryImages: [
			'/img/gallery/2024/DSC00069.webp',
			'/img/gallery/2024/DSC00075.webp',
			'/img/gallery/2024/DSC00114.webp',
			'/img/gallery/2024/DSC00124.webp',
			'/img/gallery/2024/DSC00371.webp',
			'/img/gallery/2024/IMG_0184.webp',
			'/img/gallery/2024/NI8A7853.webp',
			'/img/gallery/2024/NI8A7859.webp'
		]
	},
	{
		slug: 'luxo-2023',
		name: 'Luxo',
		year: 2023,
		image: '/img/robots/2023chargedup.png',
		description: 'Building off the success of last year, we aimed to once again build the even greater performing robot than ever before. Named after the Pixar Lamp, this fast and elegant industrial arm on wheels is build with robustness in mind and precise control implemented. The first bot in team history to win any event, and taking home a total of 3 blue banners. In addition, Luxo took home the Excelence in Engineering award and a team award, the Engineering Inspiration award.',
		game: {
			name: 'CHARGED UP',
			description: 'Robots retrieve yellow cones and purple cubes from substations and place them on a three-level scoring grid. At match end, robots balance on a tilting charge station platform.',
			logoPath: '/img/games/2023-chargedup.svg',
			revealVideoId: '0zpflsYc4PA'
		},
		techbinder: '/2023techbinder.pdf',
		videos: [
			{ name: 'Season Recap', youtubeId: 'HeokAZa2hfo' },
			{ name: 'WPI Winning Match', youtubeId: 'DxJ9BWuwGyI' },
			{ name: 'NEDCMP Wilson Winning Match', youtubeId: 'DczqfwSpFsQ' },
			{ name: 'NEDCMP Grand Finals Winning Match', youtubeId: '0g_Gj0Xq1gw' }
		],
		awards: [
			{ name: 'District Event Winner', event: 'WPI District Event' },
			{ name: 'District Championship Winner (Wilson Division)', event: 'NE District Championship' },
			{ name: 'NE District Championship Winner', event: 'NE District Championship' },
			{ name: 'Excellence in Engineering Award', event: 'NE District Championship' },
			{ name: 'Engineering Inspiration Award', event: 'NE District Championship' }
		],
		specs: {
			drivetrain: 'Swerve (SDS MK4i)',
			programmingLanguage: 'Python (RoboPy)',
			primaryMechanism: 'Industrial arm + elevator with absolute-encoder wrist',
			notableFeatures: [
				'First event-winning robot in team history',
				'Inverted electronics mounting',
				'Ranked #2 in all of New England (45-17-1 record)',
				'Qualified for World Championship (Newton Division)'
			]
		},
		competitionResults: [
			{ event: 'WPI District Event', qualRecord: '11-1-0', elimResult: 'Event Winner', rank: 'Ranked 1st' },
			{ event: 'Granite State District Event', qualRecord: '10-2-0', rank: 'Ranked 3rd' },
			{ event: 'NE District Championship (Wilson)', qualRecord: '11-1-0', elimResult: 'Division & Championship Winner', rank: 'Alliance 1 Captain' },
			{ event: 'World Championship (Newton)', qualRecord: '6-4-0', elimResult: 'Round 3 of Double Elimination', rank: '3rd pick of Alliance 6' }
		],
		galleryImages: [
			'/img/gallery/2023/332A9610.webp',
			'/img/gallery/2023/DCMP1.webp',
			'/img/gallery/2023/DCMP2.webp',
			'/img/gallery/2023/DCMP3.webp',
			'/img/gallery/2023/DCMP4.webp',
			'/img/gallery/2023/IMG_4058.webp',
			'/img/gallery/2023/IMG_4152.webp',
			'/img/gallery/2023/NI8A5748.webp'
		]
	},
	{
		slug: 'skadi-2022',
		name: 'Skadi',
		year: 2022,
		image: '/img/robots/2022rapidreact.png',
		description: 'After a long pandemic hibernation we dusted off the tools, warmed up the laser cutter, repaired the 3D printer, refilled the coffee pot and set off to build our highest performing robot to date. Named for the Norse God of Archery, this fast and nimble sniper was quick to grab balls and precisely put them on target with its Computer-Vision assisted aiming. In addition to securing playoff berths at every event it competed in - including NE Championship - Skadi took home the judges awards for both Innovation in Controls and overall Quality.',
		game: {
			name: 'RAPID REACT',
			description: 'Robots collect large rubber balls called Cargo and shoot them into a central Hub, with the upper hub scoring more. At match end, robots climb progressively higher rungs on a Hangar structure.',
			logoPath: '/img/games/2022-rapidreact.svg',
			revealVideoId: 'LgniEjI9cCM'
		},
		techbinder: '/2022techbinder.pdf',
		videos: [
			{ name: 'Season Recap', youtubeId: 's1iLbVFduqE' },
			{ name: 'Highest Scoring Match', youtubeId: 'xDQo_OFQs5Q' },
			{ name: 'WPI Point High Score', youtubeId: 'P2qm6jk8zN8' }
		],
		awards: [
			{ name: 'Innovation in Control Award', event: 'WPI District Event' },
			{ name: 'Quality Award', event: 'Granite State District Event' }
		],
		specs: {
			drivetrain: 'Swerve (SDS MK4)',
			programmingLanguage: 'Python (RoboPy)',
			primaryMechanism: 'Computer-Vision assisted ball shooter',
			notableFeatures: [
				'First robot fully designed in Onshape',
				'First CNC-fabricated parts (Origin Router)',
				'First season using Python/RoboPy',
				'Secured playoff berths at every event'
			]
		},
		competitionResults: [
			{ event: 'WPI District Event', qualRecord: '8-4-0', rank: 'Ranked 13th' },
			{ event: 'Granite State District Event', qualRecord: '9-3-0', rank: 'Ranked 8th' },
			{ event: 'NE District Championship', qualRecord: '5-7-0', elimResult: 'Playoffs' }
		],
		galleryImages: [
			'/img/gallery/2022/20220409-DSC01281.webp',
			'/img/gallery/2022/20220409-DSC01349.webp',
			'/img/gallery/2022/20220409-DSC01375.webp',
			'/img/gallery/2022/20220409-DSC01388.webp',
			'/img/gallery/2022/20220409-DSC01395.webp',
			'/img/gallery/2022/20220409-DSC01405.webp',
			'/img/gallery/2022/20220409-DSC01409.webp',
			'/img/gallery/2022/20220409-DSC01418.webp'
		]
	},
	{
		slug: 'tshirt-cannon-2022',
		name: 'T-Shirt Cannon',
		year: 2022,
		image: '/img/robots/2022tshirtcannon.png',
		description: 'This off season learning robot restarted our tradition of creating a t-shirt cannon for the school and town events. With 120psi of pressure in two tanks, it could fire a t-shirt shell far into the crowd of the bleachers.',
		isOffseason: true
	},
	{
		slug: 'mrk-xv-2020',
		name: 'Mrk. XV',
		year: 2020,
		image: '/img/robots/2020infiniterecharge.png',
		description: 'Our 15th Competition robot, while its season was cut short due to the outbreak of SARs-COVID 19 this bot was set to be a contender. With a long range turreted shooter this bot was designed to lurk in the backfield firing balls over the opponents head all match long.',
		game: {
			name: 'INFINITE RECHARGE',
			description: 'In this Star Wars-themed game, robots shoot foam Power Cells into high and low goals to power a Shield Generator. Teams spin a color wheel and climb a bar at match end.',
			logoPath: '/img/games/2020-infiniterecharge.png',
			revealVideoId: 'gmiYWTmFRVE'
		},
		specs: {
			primaryMechanism: 'Long-range turreted shooter',
			notableFeatures: [
				'Season cut short due to COVID-19 pandemic',
				'Designed for backfield shooting strategy'
			]
		},
		competitionResults: [
			{ event: 'Season cancelled due to COVID-19', qualRecord: 'N/A' }
		],
		galleryImages: [
			'/img/gallery/2020/IMG_0067.webp',
			'/img/gallery/2020/IMG_0071.webp',
			'/img/gallery/2020/IMG_0072.webp',
			'/img/gallery/2020/IMG_0073.webp',
			'/img/gallery/2020/IMG_0196.webp',
			'/img/gallery/2020/IMG_0198.webp',
			'/img/gallery/2020/IMG_0202.webp',
			'/img/gallery/2020/IMG_0203.webp'
		]
	},
	{
		slug: 'rampothy-2019',
		name: 'Rampothy',
		year: 2019,
		image: '/img/robots/2019deepspace_compressed.png',
		description: 'Designed to be the most accommodating Ramp Bot in FRC that year, this hunchbacked robot flew of the starting platform and spent most of the game fitting hatch panels to the cargo ship. When the 30 second warning bell rang it unfolded into one of the widest ramps in FRC: a feature which helped it to secure an elusive and entertaining double ramp bot climb at the Manchester District Event.',
		game: {
			name: 'DESTINATION: DEEP SPACE',
			description: 'Robots place hatch panels and load cargo onto rocket and cargo ship structures. The match begins in a Sandstorm where drivers cannot see the field, and robots climb a multi-level HAB platform at match end.',
			logoPath: '/img/games/2019-deepspace.svg',
			revealVideoId: 'Mew6G_og-PI'
		},
		competitionResults: [
			{ event: 'SE Mass District Event', qualRecord: '5-7-1', rank: 'Ranked 28th' },
			{ event: 'Manchester District Event', qualRecord: '5-7-0', rank: 'Ranked 32nd' }
		],
		galleryImages: [
			'/img/gallery/2019/DSC_7196.webp',
			'/img/gallery/2019/DSC_7198.webp',
			'/img/gallery/2019/DSC_7200.webp',
			'/img/gallery/2019/DSC_7203.webp',
			'/img/gallery/2019/DSC_7205.webp',
			'/img/gallery/2019/DSC_7213.webp',
			'/img/gallery/2019/DSC_7221.webp',
			'/img/gallery/2019/DSC_7226.webp'
		]
	},
	{
		slug: 'robot-2018',
		name: '',
		year: 2018,
		image: '/img/robots/2018firstpowerup_compressed.png',
		description: 'This crate stacking behemouth could extend to almost 10 feet tall!',
		game: {
			name: 'FIRST POWER UP',
			description: 'In this retro arcade-themed game, robots place Power Cubes on balancing scales to tip them and earn power-ups. At match end, robots climb a vertical scale structure for bonus points.',
			logoPath: '/img/games/2018-powerup.svg',
			revealVideoId: 'HZbdwYiCY74'
		},
		competitionResults: [
			{ event: 'SE Mass District Event', qualRecord: '4-8-0', rank: 'Ranked 34th' },
			{ event: 'WPI District Event', qualRecord: '4-8-0', rank: 'Ranked 36th' }
		],
		galleryImages: [
			'/img/gallery/2018/IMG_2401.webp',
			'/img/gallery/2018/IMG_2406.webp',
			'/img/gallery/2018/IMG_2408.webp',
			'/img/gallery/2018/IMG_2418.webp',
			'/img/gallery/2018/IMG_2427.webp',
			'/img/gallery/2018/IMG_2429.webp',
			'/img/gallery/2018/IMG_4395.webp',
			'/img/gallery/2018/IMG_4405.webp'
		]
	},
	{
		slug: 'robot-2017',
		name: '',
		year: 2017,
		image: '/img/robots/2017steamworks_compressed.png',
		description: 'A fast and agile Mecanum drive coupled with robust scoring mechanism and a fast climb made this bot a serious contender on the field.',
		game: {
			name: 'FIRST STEAMWORKS',
			description: 'In this steampunk-themed game, robots shoot wiffle balls into a boiler for steam pressure and deliver gears to an airship. Robots climb a rope at match end to prepare for takeoff.',
			logoPath: '/img/games/2017-steamworks.svg',
			revealVideoId: 'EMiNmJW7enI'
		},
		specs: {
			drivetrain: 'Mecanum'
		},
		competitionResults: [
			{ event: 'SE Mass District Event', qualRecord: '8-4-0', rank: 'Ranked 10th' },
			{ event: 'WPI District Event', qualRecord: '7-5-0', rank: 'Ranked 16th' }
		],
		galleryImages: [
			'/img/gallery/2017/33129322773_4f835ae615_o.webp',
			'/img/gallery/2017/33812064451_b266426225_o.webp',
			'/img/gallery/2017/DSC_8353.webp',
			'/img/gallery/2017/DSC_8360.webp',
			'/img/gallery/2017/DSC_8363.webp',
			'/img/gallery/2017/DSC_8372.webp',
			'/img/gallery/2017/DSC_8378.webp',
			'/img/gallery/2017/DSC_8379.webp'
		]
	},
	{
		slug: 'the-tank-2016',
		name: 'The Tank',
		year: 2016,
		image: '/img/robots/2016stronghold_compressed.png',
		description: 'Inspired by prototype drive systems for the US Military, this robots custom designed fully gear-driven all wheel drive system was capable of quickly fording any obstacle on the field.',
		game: {
			name: 'FIRST STRONGHOLD',
			description: 'In this medieval siege game, robots breach defensive obstacles like drawbridges, moats, and rock walls to cross into enemy territory. They shoot boulders at the opposing tower and scale the tower wall at match end.',
			logoPath: '/img/games/2016-stronghold.svg',
			revealVideoId: 'VqOKzoHJDjA'
		},
		specs: {
			drivetrain: 'Custom gear-driven all-wheel drive'
		},
		competitionResults: [
			{ event: 'Boston District Event', qualRecord: '3-9-0', rank: 'Ranked 37th' },
			{ event: 'WPI District Event', qualRecord: '3-9-0', rank: 'Ranked 38th' }
		],
		galleryImages: [
			'/img/gallery/2016/Boston-1.webp',
			'/img/gallery/2016/Boston-3.webp',
			'/img/gallery/2016/DSC_0007.webp',
			'/img/gallery/2016/DSC_0011.webp',
			'/img/gallery/2016/DSC_0015.webp',
			'/img/gallery/2016/DSC_0021.webp',
			'/img/gallery/2016/DSC_0027.webp',
			'/img/gallery/2016/DSC_0032.webp'
		]
	},
	{
		slug: 'robot-2015',
		name: '',
		year: 2015,
		image: '/img/robots/2015recyclerush_compressed.png',
		description: 'This tote stacker parks itself at the human terminal and stacks up boxes sky high with its claw arms that lift for another to slide into place.',
		game: {
			name: 'RECYCLE RUSH',
			description: 'Robots stack gray totes on scoring platforms and cap stacks with recycling containers for multipliers. Uniquely, alliances played on separate halves with no direct robot-to-robot defense.',
			logoPath: '/img/games/2015-recyclerush.svg',
			revealVideoId: 'W6UYFKNGHJ8'
		}
	},
	{
		slug: 'tshirt-cannon-2015',
		name: 'T-Shirt Cannon',
		year: 2015,
		image: '/img/robots/2015tshirtcannon_compressed.png',
		description: 'This Magazine fed, shell ejecting T-shirt cannon mounted to an experimental Mecanum drive test bed was a fun learning opportunity for new team members and was a hit with local school and town events. Capable of a 3 round per minute rate of fire and the ability to drive sideways as it strafed the crowd of pep rallies and sporting events.',
		isOffseason: true,
		specs: {
			drivetrain: 'Mecanum'
		}
	}
];

export function getRobotBySlug(slug: string): Robot | undefined {
	return robots.find((r) => r.slug === slug);
}

export function getAllSlugs(): string[] {
	return robots.map((r) => r.slug);
}

export function getAdjacentRobots(slug: string): { prev: Robot | undefined; next: Robot | undefined } {
	const index = robots.findIndex((r) => r.slug === slug);
	return {
		prev: index > 0 ? robots[index - 1] : undefined,
		next: index < robots.length - 1 ? robots[index + 1] : undefined
	};
}
