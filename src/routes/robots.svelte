<script>
	import RobotPage from '../components/robotPage.svelte';
	import Navbar from '../components/navbar.svelte';
	import Footer from '../components/footer.svelte';

	let robots = [
		{
			name: 'Proteus',
			year: '2024',
			image: '/img/robots/2024crescendo.png',
			desc: 'Insert description',
			techbinder: '/2024techbinder.pdf',
			videos: [
				{name: 'Season Recap', id: ''}
			]
		},	
		{
			name: 'Luxo',
			year: '2023',
			image: '/img/robots/2023chargedup.png',
			desc: 'Building off the success of last year, we aimed to once again build the even greater performing robot than ever before. Named after the Pixar Lamp, this fast and elegant industrial arm on wheels is build with robustness in mind and precise control implemented. The first bot in team history to win any event, and taking home a total of 3 blue banners. In addition, Luxo took home the Excelence in Engineering award and a team award, the Engineering Inspiration award.',
			techbinder: '/2023techbinder.pdf',
			videos: [
				{ name: 'Season Recap', id: 'HeokAZa2hfo' },
				{ name: 'WPI winning match', id: 'DxJ9BWuwGyI' },
				{ name: 'NEDCMP Wilson winning match', id: 'DczqfwSpFsQ' },
				{ name: 'NEDCMP grand finals winning match', id: '0g_Gj0Xq1gw' }
			]
		},
		{
			name: 'Skadi',
			year: '2022',
			image: '/img/robots/2022rapidreact.png',
			desc: 'After a long pandemic hibernation we dusted off the tools, warmed up the laser cutter, repaired the 3D printer, refilled the coffee pot and set off to build our highest performing robot to date. Named for the Norse God of Archery, this fast and nimble sniper was quick to grab balls and precisely put them on target with its Computer-Vision assisted aiming. In addition to securing playoff berths at every event it competed in - including NE Championship - Skadi took home the judges awards for both Innovation in Controls and overall Quality.',
			techbinder: '/2022techbinder.pdf',
			videos: [
				{ name: 'season recap', id: 's1iLbVFduqE' },
				{ name: 'highest scoring match', id: 'xDQo_OFQs5Q' },
				{ name: 'WPI point high score', id: 'P2qm6jk8zN8 ' }
			]
		},
		{
			name: 'T Shirt Cannon',
			year: '2022',
			image: '/img/robots/2022tshirtcannon.png',
			desc: 'This off season learning robot restarted our tradition of creating a t-shirt cannon for the school and town events. With 120psi of pressure in two tanks, it could fire a t-shirt shell far into the crowd of the bleachers.',
			techbinder: '',
			videos: []
		},
		{
			name: 'Mrk. XV',
			year: '2020',
			image: '/img/robots/2020infiniterecharge.png',
			desc: 'Our 15th Competition robot, while its season was cut short due to the outbreak of SARs-COVID 19 this bot was set to be a contender. With a long range turreted shooter this bot was designed to lurk in the backfield firing balls over the opponents head all match long.',
			techbinder: '',
			videos: []
		},
		{
			name: 'Rampothy',
			year: '2019',
			image: '/img/robots/2019deepspace_compressed.png',
			desc: 'Designed to be the most accommodating Ramp Bot in FRC that year, this hunchbacked robot flew of the starting platform and spent most of the game fitting hatch panels to the cargo ship. When the 30 second warning bell rang it unfolded into one of the widest ramps in FRC: a feature which helped it to secure an elusive and entertaining double ramp bot climb at the Manchester District Event.',
			techbinder: '',
			videos: []
		},
		{
			name: '',
			year: '2018',
			image: '/img/robots/2018firstpowerup_compressed.png',
			desc: 'This crate stacking behemouth could extend to almost 10 feet tall!',
			techbinder: '',
			videos: []
		},
		{
			name: '',
			year: '2017',
			image: '/img/robots/2017steamworks_compressed.png',
			desc: 'A fast and agile Mecanum drive coupled with robust scoring mechanism and a fast climb made this bot a serious contender on the field.',
			techbinder: '',
			videos: []
		},
		{
			name: 'The Tank',
			year: '2016',
			image: '/img/robots/2016stronghold_compressed.png',
			desc: 'Inspired by prototype drive systems for the US Military, this robots custom designed fully gear-driven all wheel drive system was capable of quickly fording any obstacle on the field.',
			techbinder: '',
			videos: []
		},
		{
			name: '',
			year: '2015',
			image: '/img/robots/2015recyclerush_compressed.png',
			desc: 'This tote stacker parks itself at the human terminal and stacks up boxes sky high with its claw arms that lift for another to slide into place.',
			techbinder: '',
			videos: []
		},
		{
			name: 'T-shirt Cannon',
			year: '2015',
			image: '/img/robots/2015tshirtcannon_compressed.png',
			desc: 'This Magazine fed, shell ejecting T-shirt cannon mounted to an experimental Mecanum drive test bed was a fun learning opportunity for new team members and was a hit with local school and town events. Capable of a 3 round per minute rate of fire and the ability to drive sideways as it strafed the crowd of pep rallies and sporting events.',
			techbinder: '',
			videos: []
		}
	];
</script>

<svelte:head>
	<title>Past Robots</title>
	<meta name="description" content="Team 1757's past robots" />
	<meta name="keywords" content="FRC, FIRST, Robotics" />
	<meta name="author" content="Westwood Robotics" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta property="og:title" content="1757 Past Robots" />
	<meta property="og:description" content="a brief summary of all of the team's past robots" />
	<meta property="og:image" content="https://whsrobotics.org/img/robots/2022rapidreact.png" />
</svelte:head>

<Navbar />
<div>
	{#each robots as { name, year, image, desc, videos, techbinder }}
		<RobotPage {name} {year} {image} {desc} {videos} {techbinder} />
	{/each}
</div>
<Footer />

<style>
	:global(body) {
		background-color: #131313;
	}
</style>
