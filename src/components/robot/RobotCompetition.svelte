<script>
	export let results;
	export let year;
</script>

<section class="max-w-5xl mx-auto px-4 py-10">
	<h2 class="text-2xl font-bold text-white mb-6">{year} Competition Results</h2>
	<div class="space-y-4">
		{#each results as result}
			<div class="bg-gray-800 rounded-xl p-5 md:p-6">
				<h3 class="text-lg font-semibold text-white mb-2">{result.event}</h3>
				<div class="flex flex-wrap gap-3">
					{#if result.qualRecord && result.qualRecord !== 'N/A'}
						<span class="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
							Record: {result.qualRecord}
						</span>
					{/if}
					{#if result.rank}
						<span class="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
							{result.rank}
						</span>
					{/if}
					{#if result.elimResult}
						<span class="bg-blue-900 text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
							{result.elimResult}
						</span>
					{/if}
				</div>
			</div>
		{/each}
	</div>
	<div class="mt-4">
		<a
			href="https://www.thebluealliance.com/team/1757/{year}"
			target="_blank"
			rel="noopener noreferrer"
			class="block w-full md:w-auto md:inline-block text-center bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
		>
			View Full Season on The Blue Alliance
		</a>
	</div>
</section>
