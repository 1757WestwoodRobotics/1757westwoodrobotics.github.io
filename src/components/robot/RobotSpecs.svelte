<script>
	export let specs;
</script>

<section class="max-w-5xl mx-auto px-4 py-10">
	<h2 class="text-2xl font-bold text-white mb-6">Technical Specifications</h2>
	<div class="bg-gray-800 rounded-xl p-6 md:p-8">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#if specs.drivetrain}
				<div class="border-b border-gray-700 pb-3">
					<p class="text-gray-400 text-sm uppercase tracking-wide">Drivetrain</p>
					<p class="text-white text-lg">{specs.drivetrain}</p>
				</div>
			{/if}
			{#if specs.weight}
				<div class="border-b border-gray-700 pb-3">
					<p class="text-gray-400 text-sm uppercase tracking-wide">Weight</p>
					<p class="text-white text-lg">{specs.weight}</p>
				</div>
			{/if}
			{#if specs.dimensions}
				<div class="border-b border-gray-700 pb-3">
					<p class="text-gray-400 text-sm uppercase tracking-wide">Dimensions</p>
					<p class="text-white text-lg">{specs.dimensions}</p>
				</div>
			{/if}
			{#if specs.primaryMechanism}
				<div class="border-b border-gray-700 pb-3">
					<p class="text-gray-400 text-sm uppercase tracking-wide">Primary Mechanism</p>
					<p class="text-white text-lg">{specs.primaryMechanism}</p>
				</div>
			{/if}
			{#if specs.motorTypes}
				<div class="border-b border-gray-700 pb-3">
					<p class="text-gray-400 text-sm uppercase tracking-wide">Motors</p>
					<p class="text-white text-lg">{specs.motorTypes}</p>
				</div>
			{/if}
			{#if specs.programmingLanguage}
				<div class="border-b border-gray-700 pb-3">
					<p class="text-gray-400 text-sm uppercase tracking-wide">Programming</p>
					<p class="text-white text-lg">{specs.programmingLanguage}</p>
				</div>
			{/if}
		</div>
		{#if specs.notableFeatures && specs.notableFeatures.length > 0}
			<div class="mt-6">
				<p class="text-gray-400 text-sm uppercase tracking-wide mb-3">Notable Features</p>
				<ul class="space-y-2">
					{#each specs.notableFeatures as feature}
						<li class="text-gray-300 flex items-start gap-2">
							<span class="text-blue-400 mt-1 flex-shrink-0">&#9654;</span>
							{feature}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</section>
