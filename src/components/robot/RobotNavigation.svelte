<script>
	export let prev;
	export let next;
</script>

<section class="max-w-5xl mx-auto px-4 py-10">
	<div class="flex flex-col sm:flex-row gap-4">
		{#if prev}
			<a
				href="/robots/{prev.slug}/"
				class="flex-1 block bg-gray-800 hover:bg-gray-700 rounded-xl p-5 transition-colors text-center sm:text-left"
			>
				<p class="text-gray-400 text-sm mb-1">&larr; Previous Robot</p>
				<p class="text-white font-semibold text-lg">
					{prev.name || `FRC ${prev.year} Robot`}
				</p>
				<p class="text-blue-400 text-sm">{prev.year}</p>
			</a>
		{:else}
			<div class="flex-1"></div>
		{/if}
		{#if next}
			<a
				href="/robots/{next.slug}/"
				class="flex-1 block bg-gray-800 hover:bg-gray-700 rounded-xl p-5 transition-colors text-center sm:text-right"
			>
				<p class="text-gray-400 text-sm mb-1">Next Robot &rarr;</p>
				<p class="text-white font-semibold text-lg">
					{next.name || `FRC ${next.year} Robot`}
				</p>
				<p class="text-blue-400 text-sm">{next.year}</p>
			</a>
		{/if}
	</div>
	<div class="mt-6">
		<a
			href="/robots/"
			class="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
		>
			View All Robots
		</a>
	</div>
</section>
