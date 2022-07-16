<script>
	import Navbar from '../components/navbar.svelte';
	import Footer from '../components/footer.svelte';
	import { onMount } from 'svelte';

	import { browser } from '$app/env';

	let Carousel; // for saving Carousel component class
	let carousel; // for calling methods of the carousel instance
	onMount(async () => {
		const module = await import('svelte-carousel');
		Carousel = module.default;
	});

	let showPopup = browser && localStorage.showPopup === undefined ? true : false;

	let hidePopup = () => {
		showPopup = false;
		localStorage.showPopup = false;
	};
</script>

<svelte:head>
	<title>Westwood Robotics</title>
	<meta name="description" content="Team 1757's page detailing their history and future" />
	<meta name="keywords" content="FRC, FIRST, Robotics" />
	<meta name="author" content="Westwood Robotics" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

<Navbar />
<div
	class="max-w-full bg-[#115724] h-screen min-h-5 align-center bg-[url('/img/banner.jpg')] bg-center bg-cover bg-blend-multiply text-white text-center flex items-center justify-center"
>
	<span>
		<h1 class="text-7xl">Westwood Robotics</h1>
		<h4><i>FIRST</i> Robotics Competition - Team 1757: Wolverines</h4>
	</span>
</div>
<div class="bg-zinc-800">
	<div class="container mx-auto text-center p-4 max-w-prose text-white">
		<div class="bg-green-600 p-3 mx-auto rounded-lg max-w-md text-black my-10">
			Westwood Robotics Inc. is a 501(c)(3) non-profit organization. Want to contribute? Donate to
			our <b
				><a
					href="https://www.paypal.com/fundraiser/charity/2843232"
					class="text-emerald-400 hover:underline">Paypal</a
				></b
			>
		</div>
		<br />
		<h3 class="text-4xl">OUR MISSION</h3>
		<br />
		<p class="text-m">
			Founded in 2006, we are a high-school robotics team from Westwood, MA with a mission to
			inspire young people to become leaders in science, technology, art, engineering, and
			mathematics by engaging them in team-based programs that build important technical and life
			skills such as leadership, innovation, communication, and self-confidence.
		</p>
		<br />
		<iframe
			class="aspect-video w-full"
			src="https://www.youtube.com/embed/s1iLbVFduqE"
			title="YouTube video player"
			frameborder="0"
			allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
			allowfullscreen
		/>
		<br />
		<hr class="p-8" />
		<a class="text-3xl m-3 text-sky-500 hover:underline mb-9" href="/robots"
			>CHECK OUT OUR ROBOTS!</a
		>
		<div class="bg-slate-800 rounded-xl drop-shadow-md mt-9">
			<svelte:component this={Carousel} bind:this={carousel} autoplay>
				<div>
					<img src="/img/robots/2022rapidreact.png" alt="Rapid React" />
					<h1>2022 Rapid React - "SKADI"</h1>
				</div>
				<div>
					<img src="/img/robots/2022tshirtcannon.png" alt="2022 T Shirt Cannon" />
					<h1>2022 T Shirt Cannon</h1>
				</div>
				<div>
					<img src="/img/robots/2020infiniterecharge.png" alt="2020 robot" class="mx-auto" />
					<h1>2020 Infinite Recharge</h1>
				</div>
				<div>
					<img src="/img/robots/2019deepspace_compressed.png" alt="2019 robot" />
					<h1>2019 Deep Space - "RAMPOTHY"</h1>
				</div>
				<div>
					<img src="/img/robots/2018firstpowerup_compressed.png" alt="2018 robot" />
					<h1>2018 Power Up</h1>
				</div>
				<div>
					<img src="/img/robots/2017steamworks_compressed.png" alt="2017 robot" />
					<h1>2017 Steamworks</h1>
				</div>
				<div>
					<img src="/img/robots/2016stronghold_compressed.png" alt="2016 robot" />
					<h1>2016 Stronghold</h1>
				</div>
				<div>
					<img src="/img/robots/2015tshirtcannon_compressed.png" alt="2015 T Shirt Cannon" />
					<h1>2015 T Shirt Cannon</h1>
				</div>
				<div>
					<img src="/img/robots/2015recyclerush_compressed.png" alt="2015 robot" />
					<h1>2015 Recycle Rush</h1>
				</div>
			</svelte:component>
		</div>
		<hr class="p-8" />
		<div class="bg-white text-black p-6 rounded-xl">
			<div class="flex items-center">
				<img src="/img/sponsors/whs.jpg" class="flex-none basis-1/3 max-w-[25%]" alt="WHS logo" />
				<p class="basis-2/3 flex-none">
					Westwood High School is a public high school located in the Greater Boston area. Westwood
					High School aims to encourage and develop students' education across all fields. <a
						class="text-sky-500 hover:underline"
						href="http://www.westwood.k12.ma.us/westwood-high-school">Learn More</a
					>
				</p>
			</div>
			<br />
			<div class="flex items-center">
				<p class="basis-2/3 flex-none">
					FIRST Robotics Competition (FRC) is an international high-school competition. FIRST is a
					foundation whose mission is to inspire young people to become science and technology
					leaders by engaging them in exciting mentor-based programs that build science,
					engineering, and technology skills. <a
						class="text-sky-500 hover:underline"
						href="https://www.firstinspires.org/robotics/frc">Learn More</a
					>
				</p>
				<img src="/img/frc_logo.jpg" alt="FRC logo" class="flex-none basis-1/3 max-w-[25%]" />
			</div>
			<br />
			<div class="flex items-center">
				<img
					src="/img/westwoodroboticsinc.png"
					class="flex-none basis-1/3 max-w-[25%]"
					alt="WW Robotics Inc Logo"
				/>
				<p class="basis-2/3 flex-none">
					Westwood Robotics, Inc. is a 501(c)(3) non-profit organization designed to support
					Westwood Robotics and promote STEM education throughout the community.
				</p>
			</div>
		</div>
		<hr class="p-8" />
		<div class="p-9 bg-gray-100 rounded-xl drop-shadow-md text-black">
			<h1 class="text-3xl mb-9">SPONSORS</h1>
			<div
				class="flex p-8 bg-cyan-400 rounded-xl drop-shadow-md justify-around items-center flex-wrap m-2 gap-2"
			>
				<a class="w-48">
					<img src="/img/sponsors/whs.jpg" />
				</a>
				<a class="w-48">
					<img src="/img/sponsors/heartlandersurgical.jpg" />
				</a>
			</div>
			<div
				class="flex p-8 bg-yellow-300 rounded-xl drop-shadow-md justify-around items-center flex-wrap m-2 gap-2"
			>
				<a class="w-32">
					<img src="/img/sponsors/primemotorgroup.jpg" />
				</a>
				<a class="w-32">
					<img src="/img/sponsors/eversource.png" />
				</a>
				<a class="w-32">
					<img src="/img/sponsors/Analog Devices.png" />
				</a>
				<a class="w-32">
					<img src="/img/sponsors/MathWorks.png" />
				</a>
				<a class="w-32">
					<img src="/img/sponsors/dedhamsavings.jpg" />
				</a>
			</div>
			<div
				class="flex p-8 bg-stone-400 rounded-xl drop-shadow-md justify-around items-center flex-wrap m-2 gap-2"
			>
				<a class="w-24">
					<img src="/img/sponsors/wegmans.png" />
				</a>
				<a class="w-24">
					<img src="/img/sponsors/savant.jpg" />
				</a>
				<a class="w-24">
					<img src="/img/sponsors/verizon.png" />
				</a>
				<a class="w-24">
					<img src="/img/sponsors/iRobot.png" />
				</a>
				<a class="w-24">
					<img src="/img/sponsors/igniteResearch.png" />
				</a>
				<a class="w-24">
					<img src="/img/sponsors/PrintMaster.png" />
				</a>
				<a class="w-24">
					<img src="/img/sponsors/Costco_Logo.png" />
				</a>
			</div>
			<div
				class="flex p-8 bg-yellow-800 rounded-xl drop-shadow-md justify-around items-center flex-wrap m-2 gap-2"
			>
				<a class="w-20">
					<img src="/img/sponsors/rochebros.jpg" />
				</a>
				<a class="w-20">
					<img src="/img/sponsors/slack.png" />
				</a>
				<a class="w-20">
					<img src="/img/sponsors/aig.png" />
				</a>
				<a class="w-20">
					<img src="/img/sponsors/energid.png" />
				</a>
				<a class="w-20">
					<img src="/img/sponsors/tockify.jpg" />
				</a>
				<a class="w-20">
					<img src="/img/sponsors/siteleaf.png" />
				</a>
				<a class="w-20">
					<img src="/img/sponsors/staples.png" />
				</a>
				<a class="w-20">
					<img src="/img/sponsors/JPLicks.jpg" />
				</a>
				<a class="w-20">
					<img src="/img/sponsors/Launie and Marino.png" />
				</a>
			</div>
		</div>
	</div>
	{#if showPopup}
		<div class="fixed bottom-5 rounded-xl bg-green-600 p-5 drop-shadow-md mx-5">
			Like the new look? We updated our website!
			<br />
			<b
				><button type="button" class="text-red-600 text-sm" on:click={hidePopup}
					>Click here to dismiss</button
				></b
			>
		</div>
	{/if}
	<Footer />
</div>
