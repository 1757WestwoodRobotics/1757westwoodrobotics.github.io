<script>
	import Navbar from '../components/navbar.svelte';
	import Fa from 'svelte-fa/src/fa.svelte';
	import {
		faTwitter,
		faYoutube,
		faFacebook,
		faInstagram
	} from '@fortawesome/free-brands-svg-icons';
	import { onMount } from 'svelte';

	let Carousel; // for saving Carousel component class
	let carousel; // for calling methods of the carousel instance
	onMount(async () => {
		const module = await import('svelte-carousel');
		Carousel = module.default;
	});
</script>

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
		<div class="bg-green-600 p-3 mx-auto rounded-lg max-w-md text-black">
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
			id="ivplayer"
			title="2022 Season Recap"
			width="640"
			height="360"
			src="https://yewtu.be/embed/s1iLbVFduqE?t=23"
			style="border:none;"
		/>
		<br />
		<hr class="p-8">
			<a class="text-3xl m-3 text-sky-500 hover:underline" href="/robots">CHECK OUT OUR ROBOTS!</a>
		<div class="bg-slate-800 rounded-xl drop-shadow-md">
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
		<hr class="p-8">
		<div class="bg-white text-black p-6 rounded-xl">
		    <div class="flex">
		        <img src="/img/sponsors/whs.jpg" class="flex-none basis-1/3 max-w-[25%]" alt="WHS logo"/>
		        <p class="basis-2/3 flex-none">
                Westwood High School is a public high school located in the Greater Boston area. Westwood High School aims to encourage and develop students' education across all fields.<a class="text-sky-500 hover:underline" href="http://www.westwood.k12.ma.us/westwood-high-school">Learn More</a>
		        </p>

		    </div>
		    <br>
		    <div class="flex items-center">
		        <p class="basis-2/3 flex-none">
                FIRST Robotics Competition (FRC) is an international high-school competition. FIRST is a foundation whose mission is to inspire young people to become science and technology leaders by engaging them in exciting mentor-based programs that build science, engineering, and technology skills.<a class="text-sky-500 hover:underline" href="https://www.firstinspires.org/robotics/frc" >Learn More</a>
		        </p>
		        <img src="/img/frc_logo.jpg" alt="FRC logo" class="flex-none basis-1/3 max-w-[25%]"/>
		    </div>
		    <br>
		    <div class="flex items-center">
		        <img src="/img/westwoodroboticsinc.png" class="flex-none basis-1/3 max-w-[25%]" alt="WW Robotics Inc Logo"/>
		        <p class="basis-2/3 flex-none">
                Westwood Robotics, Inc. is a 501(c)(3) non-profit organization designed to support Westwood Robotics and promote STEM education throughout the community.
		        </p>
		    </div>
		</div>
		<hr class="p-8">
		<div class="p-9 bg-gray-100 rounded-xl drop-shadow-md text-black">
		    <h1 class="text-3xl">SPONSORS</h1>
		    <div class="flex p-8 bg-cyan-400 rounded-xl drop-shadow-md justify-around items-center flex-wrap m-2 gap-2">
		        <a class="w-48">
		            <img src="/img/sponsors/whs.jpg"/>
		        </a>
		        <a class="w-48">
		            <img src="/img/sponsors/heartlandersurgical.jpg"/>
		        </a>
		    </div>
		    <div class="flex p-8 bg-yellow-300 rounded-xl drop-shadow-md justify-around items-center flex-wrap m-2 gap-2">
		        <a class="w-32">
		            <img src="/img/sponsors/primemotorgroup.jpg"/>
		        </a>
		        <a class="w-32">
		            <img src="/img/sponsors/eversource.png"/>
		        </a>
		        <a class="w-32">
		            <img src="/img/sponsors/Analog Devices.png"/>
		        </a>
		        <a class="w-32">
		            <img src="/img/sponsors/MathWorks.png"/>
		        </a>
		        <a class="w-32">
		            <img src="/img/sponsors/dedhamsavings.jpg"/>
		        </a>
		    </div>
		    <div class="flex p-8 bg-stone-400 rounded-xl drop-shadow-md justify-around items-center flex-wrap m-2 gap-2">
		        <a class="w-24">
		            <img src="/img/sponsors/wegmans.png"/>
		        </a>
		        <a class="w-24">
		            <img src="/img/sponsors/savant.jpg"/>
		        </a>
		        <a class="w-24">
		            <img src="/img/sponsors/verizon.png"/>
		        </a>
		        <a class="w-24">
		            <img src="/img/sponsors/iRobot.png"/>
		        </a>
		        <a class="w-24">
		            <img src="/img/sponsors/igniteResearch.png"/>
		        </a>
		        <a class="w-24">
		            <img src="/img/sponsors/PrintMaster.png"/>
		        </a>
		        <a class="w-24">
		            <img src="/img/sponsors/Costco_Logo.png"/>
		        </a>
		    </div>
		    <div class="flex p-8 bg-yellow-800 rounded-xl drop-shadow-md justify-around items-center flex-wrap m-2 gap-2">
		        <a class="w-20">
		            <img src="/img/sponsors/rochebros.jpg"/>
		        </a>
		        <a class="w-20">
		            <img src="/img/sponsors/slack.png"/>
		        </a>
		        <a class="w-20">
		            <img src="/img/sponsors/aig.png"/>
		        </a>
		        <a class="w-20">
		            <img src="/img/sponsors/energid.png"/>
		        </a>
		        <a class="w-20">
		            <img src="/img/sponsors/tockify.jpg"/>
		        </a>
		        <a class="w-20">
		            <img src="/img/sponsors/siteleaf.png"/>
		        </a>
		        <a class="w-20">
		            <img src="/img/sponsors/staples.png"/>
		        </a>
		        <a class="w-20">
		            <img src="/img/sponsors/JPLicks.jpg"/>
		        </a>
		        <a class="w-20">
		            <img src="/img/sponsors/Launie and Marino.png"/>
		        </a>
		    </div>
		</div>
	</div>
	<div class="w-full flex text-white bg-teal-500 flex-wrap">
		<div class="text-center p-5 grow shrink basis-1/2 md:basis-1/3">
			<h2 class="text-xl"><b>CONTACT</b></h2>
			<br />
			<h5>Email:<br />contact@whsrobotics.org</h5>
		</div>
		<div class="text-center p-5 grow shrink basis-1/2 md:basis-1/3">
			<h2 class="text-xl"><b>LOCATION</b></h2>
			<br />
			<h5>Westwood High School</h5>
			<h5>200 Nahatan Street #A160</h5>
			<h5>Westwood, MA 02090</h5>
		</div>
		<div class="text-center p-5 grow shrink basis-1/2 md:basis-1/3">
			<h2 class="text-xl"><b>STAY CONNECTED</b></h2>
			<br />
			<span class="flex gap-3 justify-center text-3xl cursor-pointer wrap basis-1/2 md:basis-1/3">
				<a href="https://twitter.com/WWRobotics1757" class="rounded-full bg-stone-700 hover:bg-stone-900 p-2 transition-colors">
					<Fa icon={faTwitter} />
				</a>
				<a href="https://youtube.com/channel/UCIBET5BFj97t2WCr-tzr1VQ" class="rounded-full bg-stone-700 hover:bg-stone-900 p-2 transition-colors">
					<Fa icon={faYoutube} />
				</a>
				<a href="https://www.instagram.com/wwrobotics1757" class="rounded-full bg-stone-700 hover:bg-stone-900 p-2 transition-colors">
					<Fa icon={faInstagram} />
				</a>
				<a href="https://www.facebook.com/WWRobotics1757" class="rounded-full bg-stone-700 hover:bg-stone-900 p-2 transition-colors">
					<Fa icon={faFacebook} />
				</a>
			</span>
		</div>
	</div>
	<div class="w-full text-white bg-stone-600 text-center p-7">
        Created and © 2020 by Westwood Robotics. All Rights Reserved.
	</div>
</div>
