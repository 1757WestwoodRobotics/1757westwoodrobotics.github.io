<script>
	export let images;
	export let robotName;

	let selectedImage = '';

	function openLightbox(src) {
		selectedImage = src;
	}

	function closeLightbox() {
		selectedImage = '';
	}
</script>

<section class="max-w-5xl mx-auto px-4 py-10">
	<h2 class="text-2xl font-bold text-white mb-6">Photo Gallery</h2>
	<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
		{#each images as src}
			<button
				on:click={() => openLightbox(src)}
				class="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer bg-gray-800"
			>
				<img
					{src}
					alt="{robotName} gallery photo"
					class="w-full h-full object-cover"
					loading="lazy"
				/>
			</button>
		{/each}
	</div>
</section>

{#if selectedImage}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
		on:click={closeLightbox}
		on:keydown={(e) => e.key === 'Escape' && closeLightbox()}
		role="dialog"
		tabindex="-1"
	>
		<button
			on:click={closeLightbox}
			class="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 bg-gray-800 bg-opacity-70 rounded-full w-12 h-12 flex items-center justify-center"
			aria-label="Close lightbox"
		>
			&times;
		</button>
		<img
			src={selectedImage}
			alt="{robotName} gallery photo (full size)"
			class="max-w-full max-h-[85vh] object-contain rounded-lg"
		/>
	</div>
{/if}
