<script>
	export let alliance = 'red'; // 'red' or 'blue'
	export let epa = 0;
	export let opr = 0;

	const isRed = alliance === 'red';
	const allianceLabel = isRed ? 'Red Alliance' : 'Blue Alliance';
	const allianceColor = isRed ? 'text-red-500' : 'text-blue-500';
	const labelColor = isRed ? 'text-red-400' : 'text-blue-400';
</script>

<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 md:mb-8">
	<h2 class="text-2xl md:text-3xl font-black {allianceColor} uppercase italic tracking-tighter">
		{allianceLabel}
	</h2>
	<div class="flex gap-4 md:gap-6">
		<div class="text-right">
			<p class="text-[8px] md:text-[10px] font-black {labelColor} uppercase tracking-[0.2em]">EPA</p>
			<p class="text-2xl md:text-4xl font-black text-white">{epa.toFixed(1)}</p>
		</div>
		<div class="text-right">
			<p class="text-[8px] md:text-[10px] font-black {labelColor} uppercase tracking-[0.2em]">OPR</p>
			<p class="text-2xl md:text-4xl font-black text-orange-400">{opr.toFixed(1)}</p>
		</div>
	</div>
</div>
