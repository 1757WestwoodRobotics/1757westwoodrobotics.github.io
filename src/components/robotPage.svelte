<script>
	export let name;
	export let image;
	export let desc;
	export let videos;
	export let year;
	export let techbinder;

	let showVideos = false;
</script>

<div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden h-full">
	<div style="background-image: url({image})" class="w-full h-96 bg-contain bg-center bg-no-repeat"></div>
	<div class="p-6">
		<h2 class="text-2xl font-bold text-white mb-2">{year}{name !== '' ? ' - ' : ''}{name}</h2>
		<p class="text-gray-400 mb-4">{desc}</p>
		<div class="flex justify-between items-center">
			{#if techbinder != ''}
				<a href={techbinder} class="text-blue-500 hover:underline">Technical Binder</a>
			{/if}
			{#if videos.length > 0}
				<button
					on:click={() => (showVideos = !showVideos)}
					class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
				>
					{showVideos ? 'Hide' : 'Show'} Videos
				</button>
			{/if}
		</div>
	</div>
	{#if showVideos && videos.length > 0}
		<div class="px-6 pb-4">
			<h3 class="text-xl font-bold text-white mb-2">Videos</h3>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{#each videos as { name, id }}
					<a
						href="https://youtu.be/{id}"
						target="_blank"
						rel="noopener noreferrer"
						class="text-blue-400 hover:underline"
					>
						{name}
					</a>
				{/each}
			</div>
		</div>
	{/if}
</div>
