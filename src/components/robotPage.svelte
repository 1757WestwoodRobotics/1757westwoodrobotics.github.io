<script>
	export let name;
	export let image;
	export let desc;
	export let videos;
	export let year;
	export let techbinder;

	let showVideos = false;
</script>

<div class="bg-slate-900 flex flex-wrap overflow-auto p-5 h-full m-4 rounded-lg items-center">
	<span class="grow flex-col md:basis-5/12 flex justify-center items-center shrink basis-full">
		<img src={image} class="bg-[url('{image}')] aspect-auto" />
	</span>
	<div class="text-center w-full p-4 text-white flex-auto basis-7/12">
		<h2 class="text-3xl">{year}{name !== '' ? ' - ' : ''}{name}</h2>
		<p>{desc}</p>
		{#if techbinder != ''}
			<a href={techbinder} class="m-4 text-blue-500 underline">View the technical binder</a>
		{/if}
		<br />
		{#if videos != ''}
			<div
				class="bottom-0 inset-x-0 text-blue-400 underline hover:cursor-pointer text-xl"
				on:click={() => {
					showVideos = !showVideos;
				}}
			>
				Videos
			</div>
			<div class="flex w-full justify-around items-center flex-wrap">
				{#if showVideos}
					{#each videos as { name, id }}
						<a class="text-blue-500 hover:underline" target="_blank" href="https://youtu.be/{id}"
							>{name}</a
						>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
</div>
