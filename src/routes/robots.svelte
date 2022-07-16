<script>
	import RobotPage from '../components/robotPage.svelte';
	import Navbar from '../components/navbar.svelte';
	import Footer from '../components/footer.svelte';

	let robots = [
		{
			name: 'Skadi',
			year: '2022',
			image: '/img/robots/2022rapidreact.png',
			desc: 'After a long pandemic hibernation we dusted off the tools, warmed up the laser cutter, repaired the 3D printer, refilled the coffee pot and set off to build our highest performing robot to date. Named for the Norse God of Archery, this fast and nimble sniper was quick to grab balls and precisely put them on target with its Computer-Vision assisted aiming. In addition to securing playoff berths at every event it competed in - including NE Championship - Skadi took home the judges awards for both Innovation in Controls and overall Quality.',
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
			videos: []
		},
		{
			name: 'Mrk. XV',
			year: '2020',
			image: '/img/robots/2020infiniterecharge.png',
			desc: 'Our 15th Competition robot, while its season was cut short due to the outbreak of SARs-COVID 19 this bot was set to be a contender. With a long range turreted shooter this bot was designed to lurk in the backfield firing balls over the opponents head all match long.',
			videos: []
		},
		{
			name: 'Rampothy',
			year: '2019',
			image: '/img/robots/2019deepspace_compressed.png',
			desc: 'Designed to be the most accommodating Ramp Bot in FRC that year, this hunchbacked robot flew of the starting platform and spent most of the game fitting hatch panels to the cargo ship. When the 30 second warning bell rang it unfolded into one of the widest ramps in FRC: a feature which helped it to secure an elusive and entertaining double ramp bot climb at the Manchester District Event.',
			videos: []
		},
		{
			name: '',
			year: '2018',
			image: '/img/robots/2018firstpowerup_compressed.png',
			desc: 'This crate stacking behemouth could extend to almost 10 feet tall!',
			videos: []
		},
		{
			name: '',
			year: '2017',
			image: '/img/robots/2017steamworks_compressed.png',
			desc: 'A fast and agile Mecanum drive coupled with robust scoring mechanism and a fast climb made this bot a serious contender on the field.',
			videos: []
		},
		{
			name: 'The Tank',
			year: '2016',
			image: '/img/robots/2016stronghold_compressed.png',
			desc: 'Inspired by prototype drive systems for the US Military, this robots custom designed fully gear-driven all wheel drive system was capable of quickly fording any obstacle on the field.',
			videos: []
		},
		{
			name: '',
			year: '2015',
			image: '/img/robots/2015recyclerush_compressed.png',
			desc: 'This tote stacker parks itself at the human terminal and stacks up boxes sky high with its claw arms that lift for another to slide into place.',
			videos: []
		},
		{
			name: 'T-shirt Cannon',
			year: '2015',
			image: '/img/robots/2015tshirtcannon_compressed.png',
			desc: 'This Magazine fed, shell ejecting T-shirt cannon mounted to an experimental Mecanum drive test bed was a fun learning opportunity for new team members and was a hit with local school and town events. Capable of a 3 round per minute rate of fire and the ability to drive sideways as it strafed the crowd of pep rallies and sporting events.',
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
</svelte:head>

<Navbar />
<div>
	{#each robots as { name, year, image, desc, videos }}
		<RobotPage {name} {year} {image} {desc} {videos} />
	{/each}
</div>
<Footer />

<style>
	:global(body) {
		background-color: #131313;
	}
</style>
