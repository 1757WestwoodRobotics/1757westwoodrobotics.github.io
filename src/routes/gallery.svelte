<script>
	import Navbar from '../components/navbar.svelte';
	import Footer from '../components/footer.svelte';

	import { onMount } from 'svelte';

	let Carousel; // for saving Carousel component class
	let carousel; // for calling methods of the carousel instance
	onMount(async () => {
		const module = await import('svelte-carousel');
		Carousel = module.default;
	});

	let urls = {
		'2022': [
			'/img/dcmp_team.jpg',
			'/img/team_bg.jpg',
			'/img/robot_pic.png',
			'/img/coolio.png',
			'/img/gallery/2022/_36A9645.png',
			'/img/gallery/2022/_36A9650.png',
			'/img/gallery/2022/_36A9659.png',
			'/img/gallery/2022/_36A9661_02.png',
			'/img/gallery/2022/_36A9677.png',
			'/img/gallery/2022/_36A9684.png',
			'/img/gallery/2022/_36A9702.png',
			'/img/gallery/2022/_36A9706.png',
			'/img/gallery/2022/_36A9711.png',
			'/img/gallery/2022/_36A9731.png',
			'/img/gallery/2022/_36A9911_03.png',
			'/img/gallery/2022/_36A9539.png',
			'/img/gallery/2022/_36A9562.png',
			'/img/gallery/2022/_36A9585.png',
			'/img/gallery/2022/_36A9612.png',
			'/img/gallery/2022/_36A9618.png',
			'/img/gallery/2022/_36A9628.png',
			'/img/gallery/2022/_36A9631_01.png'
		]
	};
</script>

<Navbar />

<div class="w-full min-h-screen bg-slate-900 text-white">
	<br />
	<h3 class="w-full text-center text-5xl">2022: Rapid React</h3>
	<div class="rounded-xl p-4 drop-shadow-sm bg-slate-800 m-4">
		<svelte:component
			this={Carousel}
			bind:this={carousel}
			autoplay
			pauseOnFocus
			autoplayProgressVisible
		>
			{#each urls['2022'] as url}
				<div class="mx-auto my-4 w-full h-full flex items-center justify-center align-center">
					<img src={url} class="max-h-[70vh]" />
				</div>
			{/each}
		</svelte:component>
	</div>
</div>

<Footer />
