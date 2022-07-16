<script>
	export let name;
	export let image;
	export let desc;
	export let videos;
	export let year;

	let showVideos = false;
</script>

<div class="bg-slate-900 border-2 border-teal-400 flex flex-wrap overflow-auto">
	<span class="grow flex-col basis-2 flex justify-center items-center h-full">
		<img src={image} class="bg-[url('{image}')] aspect-auto" />
		{#if videos != ''}
			<div
				class="bottom-0 inset-x-0 text-gray-300 hover:underline hover:cursor-pointer text-xl"
				on:click={() => {
					showVideos = !showVideos;
				}}
			>
				Videos
			</div>
			{#if showVideos}
				{#each videos as { name, id }}
					<a class="text-blue-500 hover:underline" target="_blank" href="https://youtu.be/{id}"
						>{name}</a
					>
				{/each}
			{/if}
		{/if}
	</span>
	<div class="text-center w-full p-4 text-white flex-auto basis-full md:basis-2">
		<h2 class="text-3xl">{year}{name !== '' ? ' - ' : ''}{name}</h2>
		<p>{desc}</p>
	</div>
</div>
