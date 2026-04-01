<script>
	import { robots } from '$lib/data/robots';
	import RobotCard from '../../components/RobotCard.svelte';
	import Navbar from '../../components/navbar.svelte';
	import Footer from '../../components/footer.svelte';
</script>

<svelte:head>
	<title>Past Robots | Westwood Robotics</title>
	<meta name="description" content="Explore every robot Team 1757 Westwood Robotics has built since 2015" />
	<meta property="og:title" content="Past Robots | Team 1757" />
	<meta property="og:description" content="Explore every robot Team 1757 Westwood Robotics has built since 2015" />
	<meta property="og:image" content="https://whsrobotics.org/img/robots/2023chargedup.png" />
</svelte:head>

<Navbar />

<main class="min-h-screen">
	<section class="max-w-5xl mx-auto px-4 pt-12 pb-8 text-center">
		<h1 class="text-4xl md:text-5xl font-bold text-white mb-4">Our Robots</h1>
		<p class="text-gray-400 text-lg max-w-2xl mx-auto">
			From our earliest builds to our most advanced competition robots, explore the machines that have represented Team 1757 on the field.
		</p>
	</section>

	<section class="max-w-5xl mx-auto px-4 pb-16">
		<div class="relative">
			<div class="hidden md:block absolute left-8 top-0 bottom-0 w-0.5 bg-gray-700"></div>

			<div class="space-y-6">
				{#each robots as robot}
					<div class="relative md:pl-20">
						<div class="hidden md:flex absolute left-5 top-6 w-7 h-7 bg-blue-600 rounded-full items-center justify-center z-10">
							<span class="text-white text-xs font-bold">{String(robot.year).slice(-2)}</span>
						</div>
						<RobotCard {robot} />
					</div>
				{/each}
			</div>
		</div>
	</section>
</main>

<Footer />

<style>
	:global(body) {
		background-color: #131313;
	}
</style>
