<script>
	export let awards;
</script>

<section class="max-w-5xl mx-auto px-4 py-10">
	<h2 class="text-2xl font-bold text-white mb-6">Awards</h2>
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		{#each awards as award}
			<div class="bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl p-5 border border-blue-700">
				<p class="text-white font-semibold text-lg">{award.name}</p>
				<p class="text-blue-300 text-sm mt-1">{award.event}</p>
			</div>
		{/each}
	</div>
</section>
