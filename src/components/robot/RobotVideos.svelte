<script>
	export let videos;
</script>

<section class="max-w-5xl mx-auto px-4 py-10">
	<h2 class="text-2xl font-bold text-white mb-6">Videos</h2>
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		{#each videos as video}
			<div class="bg-gray-800 rounded-xl overflow-hidden">
				<div class="aspect-video">
					<iframe
						src="https://www.youtube.com/embed/{video.youtubeId}"
						title={video.name}
						class="w-full h-full"
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowfullscreen
					></iframe>
				</div>
				<div class="p-3">
					<p class="text-gray-300 font-medium text-center">{video.name}</p>
				</div>
			</div>
		{/each}
	</div>
</section>
