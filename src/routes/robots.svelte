<script>
	import RobotPage from '../components/robotPage.svelte';
	import Navbar from '../components/navbar.svelte';

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
		}
	];
</script>

<Navbar/>
<br>
<div class="container mx-auto">
	{#each robots as { name, year, image, desc, videos }}
		<RobotPage {name} {year} {image} {desc} {videos} />
	{/each}
</div>

<style>
	:global(body) {
		background-color: #131313;
	}
</style>
