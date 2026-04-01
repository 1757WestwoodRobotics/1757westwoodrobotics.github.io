<script>
	export let name;
	export let year;
	export let image;
	export let gameName;
</script>

<section class="relative w-full bg-gray-900 overflow-hidden">
	<div class="max-w-5xl mx-auto px-4 py-12 md:py-20 flex flex-col items-center">
		<div class="w-full max-w-2xl h-72 md:h-96 mb-8">
			<img
				src={image}
				alt="{name || 'Team 1757 Robot'} - {year}"
				class="w-full h-full object-contain"
			/>
		</div>
		<div class="text-center">
			<p class="text-blue-400 text-lg font-medium tracking-wide uppercase mb-2">
				{year}{gameName ? ` \u2022 ${gameName}` : ''}
			</p>
			<h1 class="text-4xl md:text-5xl font-bold text-white">
				{name || `FRC ${year} Robot`}
			</h1>
		</div>
	</div>
</section>
