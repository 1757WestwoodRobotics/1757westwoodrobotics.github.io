<script>
	import Navbar from '../../../components/navbar.svelte';
	import Footer from '../../../components/footer.svelte';
	import RobotHero from '../../../components/robot/RobotHero.svelte';
	import RobotGameSection from '../../../components/robot/RobotGameSection.svelte';
	import RobotSpecs from '../../../components/robot/RobotSpecs.svelte';
	import RobotCompetition from '../../../components/robot/RobotCompetition.svelte';
	import RobotAwards from '../../../components/robot/RobotAwards.svelte';
	import RobotGallery from '../../../components/robot/RobotGallery.svelte';
	import RobotVideos from '../../../components/robot/RobotVideos.svelte';
	import RobotNavigation from '../../../components/robot/RobotNavigation.svelte';

	export let data;

	$: robot = data.robot;
	$: prev = data.prev;
	$: next = data.next;
	$: displayName = robot.name || `FRC ${robot.year} Robot`;
</script>

<svelte:head>
	<title>{displayName} ({robot.year}) | Westwood Robotics</title>
	<meta name="description" content="{displayName} - {robot.description.substring(0, 150)}..." />
	<meta property="og:title" content="{displayName} ({robot.year}) | Team 1757" />
	<meta property="og:description" content={robot.description.substring(0, 200)} />
	<meta property="og:image" content="https://whsrobotics.org{robot.image}" />
</svelte:head>

<Navbar />

<main class="min-h-screen">
	<RobotHero
		name={robot.name}
		year={robot.year}
		image={robot.image}
		gameName={robot.game?.name || ''}
	/>

	{#if robot.game && !robot.isOffseason}
		<RobotGameSection game={robot.game} />
	{/if}

	<section class="max-w-5xl mx-auto px-4 py-10">
		<h2 class="text-2xl font-bold text-white mb-4">About This Robot</h2>
		<div class="bg-gray-800 rounded-xl p-6 md:p-8">
			<p class="text-gray-300 text-lg leading-relaxed">{robot.description}</p>
			{#if robot.narrative}
				<p class="text-gray-300 text-lg leading-relaxed mt-4">{robot.narrative}</p>
			{/if}
		</div>
	</section>

	{#if robot.specs}
		<RobotSpecs specs={robot.specs} />
	{/if}

	{#if robot.competitionResults && robot.competitionResults.length > 0}
		<RobotCompetition results={robot.competitionResults} year={robot.year} />
	{/if}

	{#if robot.awards && robot.awards.length > 0}
		<RobotAwards awards={robot.awards} />
	{/if}

	{#if robot.galleryImages && robot.galleryImages.length > 0}
		<RobotGallery images={robot.galleryImages} robotName={displayName} />
	{/if}

	{#if robot.videos && robot.videos.length > 0}
		<RobotVideos videos={robot.videos} />
	{/if}

	{#if robot.techbinder}
		<section class="max-w-5xl mx-auto px-4 py-10">
			<a
				href={robot.techbinder}
				target="_blank"
				rel="noopener noreferrer"
				class="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
			>
				Download Technical Binder (PDF)
			</a>
		</section>
	{/if}

	<RobotNavigation {prev} {next} />
</main>

<Footer />

<style>
	:global(body) {
		background-color: #131313;
	}
</style>
