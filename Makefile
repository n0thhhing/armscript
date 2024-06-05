.PHONY: format
format:
	find . -type f -name '*.bak' -exec rm {} +
	prettier -w --ignore-unknown *
	clang-format src/*.cpp src/*.hpp -i

.PHONY: type
type:
	-tsc \
		src/tokenizer.ts \
		src/parser.ts \
		src/colors.ts \
		src/formatter.ts \
		src/memory.ts \
		--downlevelIteration true \
		--declaration \
		--outDir src \
		--emitDeclarationOnly \
		--allowJs true \
		--esModuleInterop true

.PHONT: analyze
analyze:
	as -o analyze.o analyze.s
	objdump analyze.o -D