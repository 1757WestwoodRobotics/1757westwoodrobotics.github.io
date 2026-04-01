<script>
	export let game;
</script>

<section class="max-w-5xl mx-auto px-4 py-10">
	<h2 class="text-2xl font-bold text-white mb-6">The Game</h2>
	<div class="bg-gray-800 rounded-xl p-6 md:p-8">
		<div class="flex flex-col md:flex-row items-start gap-6 mb-6">
			<img
				src={game.logoPath}
				alt="{game.name} logo"
				class="w-32 h-32 md:w-40 md:h-40 object-contain flex-shrink-0"
			/>
			<div>
				<h3 class="text-xl font-bold text-blue-400 mb-3">{game.name}</h3>
				<p class="text-gray-300 text-base leading-relaxed">{game.description}</p>
			</div>
		</div>
		<div class="aspect-video w-full rounded-lg overflow-hidden">
			<iframe
				src="https://www.youtube.com/embed/{game.revealVideoId}"
				title="{game.name} Game Reveal"
				class="w-full h-full"
				frameborder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowfullscreen
			></iframe>
		</div>
	</div>
</section>
