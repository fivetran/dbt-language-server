import { TypeKind } from '@fivetrandevelopers/zetasql';
import { AnyASTTypeProto, AnyASTTypeProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/AnyASTTypeProto';
import { ASTArrayTypeProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ASTArrayTypeProto';
import { ASTSimpleTypeProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ASTSimpleTypeProto';
import { ASTStructTypeProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ASTStructTypeProto';
import { ParseLocationRangeProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRangeProto';
import { TypeProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/TypeProto';
import { assertThat } from 'hamjest';
import { positionInRange, rangeContainsRange, rangesEqual, toTypeProto } from '../../utils/ZetaSqlUtils';

describe('ZetaSqlUtils', () => {
  it('positionInRange should return whether the range contains specified position', () => {
    assertThat(positionInRange(5, createRange(5, 8)), true);
    assertThat(positionInRange(7, createRange(5, 8)), true);
    assertThat(positionInRange(8, createRange(5, 8)), true);

    assertThat(positionInRange(4, createRange(5, 8)), false);
    assertThat(positionInRange(9, createRange(5, 8)), false);
  });

  it('rangeContainsRange should return whether the range contains another range', () => {
    assertThat(rangeContainsRange(createRange(5, 8), createRange(5, 6)), true);
    assertThat(rangeContainsRange(createRange(5, 8), createRange(6, 7)), true);
    assertThat(rangeContainsRange(createRange(5, 8), createRange(7, 8)), true);
    assertThat(rangeContainsRange(createRange(5, 8), createRange(5, 8)), true);

    assertThat(rangeContainsRange(createRange(5, 8), createRange(5, 9)), false);
    assertThat(rangeContainsRange(createRange(5, 8), createRange(4, 9)), false);
    assertThat(rangeContainsRange(createRange(5, 8), createRange(8, 9)), false);
    assertThat(rangeContainsRange(createRange(5, 8), createRange(9, 9)), false);
    assertThat(rangeContainsRange(createRange(5, 8), createRange(1, 3)), false);
    assertThat(rangeContainsRange(createRange(5, 8), createRange(4, 5)), false);
    assertThat(rangeContainsRange(createRange(5, 8), createRange(4, 9)), false);
  });

  it('rangesEqual should return whether the ranges are equal', () => {
    assertThat(rangesEqual(createRange(5, 8), createRange(5, 8)), true);

    assertThat(rangesEqual(createRange(5, 8), createRange(4, 8)), false);
    assertThat(rangesEqual(createRange(5, 8), createRange(5, 9)), false);
    assertThat(rangesEqual(createRange(4, 8), createRange(5, 8)), false);
    assertThat(rangesEqual(createRange(5, 9), createRange(5, 8)), false);
    assertThat(rangesEqual(createRange(1, 3), createRange(5, 8)), false);
    assertThat(rangesEqual(createRange(5, 8), createRange(1, 3)), false);
  });

  it('toTypeProto should convert astSimpleTypeNode', () => {
    // arrange
    const astType = createAstSimpleTypeNode({
      typeName: {
        names: [
          {
            idString: 'INT64',
          },
        ],
      },
    });

    // act, assert
    toTypeProtoShouldConvertType(astType, { typeKind: TypeKind.TYPE_INT64 });
  });

  it('toTypeProto should not convert astSimpleTypeNode if type is wrong', () => {
    // arrange
    const astType = createAstSimpleTypeNode({
      typeName: {
        names: [
          {
            idString: 'uuINT64',
          },
        ],
      },
    });

    // act, assert
    toTypeProtoShouldConvertType(astType, undefined);
  });

  it('toTypeProto should not convert astSimpleTypeNode if names is empty', () => {
    // arrange
    const astType = createAstSimpleTypeNode({
      typeName: {
        names: [],
      },
    });

    // act, assert
    toTypeProtoShouldConvertType(astType, undefined);
  });

  it('toTypeProto should not convert astSimpleTypeNode if typeName is empty object', () => {
    // arrange
    const astType = createAstSimpleTypeNode({
      typeName: {},
    });

    // act, assert
    toTypeProtoShouldConvertType(astType, undefined);
  });

  it('toTypeProto should not convert astSimpleTypeNode if astSimpleTypeNode is empty object', () => {
    // arrange
    const astType = createAstSimpleTypeNode({});

    // act, assert
    toTypeProtoShouldConvertType(astType, undefined);
  });

  it('toTypeProto should not convert astSimpleTypeNode if astSimpleTypeNode is undefined', () => {
    // arrange
    const astType = createAstSimpleTypeNode(undefined);

    // act, assert
    toTypeProtoShouldConvertType(astType, undefined);
  });

  it('toTypeProto should convert astArrayTypeNode', () => {
    // arrange
    const astType = createAstArrayTypeNode({
      elementType: createAstSimpleTypeNode({
        typeName: {
          names: [
            {
              idString: 'string',
            },
          ],
        },
      }),
    });

    // act, assert
    toTypeProtoShouldConvertType(astType, {
      typeKind: TypeKind.TYPE_ARRAY,
      arrayType: {
        elementType: {
          typeKind: TypeKind.TYPE_STRING,
        },
      },
    });
  });

  it('toTypeProto should not convert astArrayTypeNode if idString is wrong', () => {
    // arrange
    const astType = createAstArrayTypeNode({
      elementType: createAstSimpleTypeNode({
        typeName: {
          names: [
            {
              idString: 'strings',
            },
          ],
        },
      }),
    });

    // act, assert
    toTypeProtoShouldConvertType(astType, undefined);
  });

  it('toTypeProto should not convert astArrayTypeNode if names is empty', () => {
    // arrange
    const astType = createAstArrayTypeNode({
      elementType: createAstSimpleTypeNode({
        typeName: {
          names: [],
        },
      }),
    });

    // act, assert
    toTypeProtoShouldConvertType(astType, undefined);
  });

  it('toTypeProto should not convert astArrayTypeNode if typeName is empty object', () => {
    // arrange
    const astType = createAstArrayTypeNode({
      elementType: createAstSimpleTypeNode({
        typeName: {},
      }),
    });

    // act, assert
    toTypeProtoShouldConvertType(astType, undefined);
  });

  it('toTypeProto should not convert astArrayTypeNode if astSimpleTypeNode is empty object', () => {
    // arrange
    const astType = createAstArrayTypeNode({
      elementType: createAstSimpleTypeNode({}),
    });

    // act, assert
    toTypeProtoShouldConvertType(astType, undefined);
  });

  it('toTypeProto should not convert astArrayTypeNode if createAstArrayTypeNode is empty object', () => {
    // arrange
    const astType = createAstArrayTypeNode({});

    // act, assert
    toTypeProtoShouldConvertType(astType, undefined);
  });

  it('toTypeProto should convert astStructTypeNode', () => {
    // arrange
    const astType = createAstStructTypeNode({
      structFields: [
        {
          name: { idString: 'structField' },
          type: createAstSimpleTypeNode({
            typeName: {
              names: [
                {
                  idString: 'date',
                },
              ],
            },
          }),
        },
      ],
    });

    // act, assert
    toTypeProtoShouldConvertType(astType, {
      typeKind: TypeKind.TYPE_STRUCT,
      structType: {
        field: [
          {
            fieldName: 'structField',
            fieldType: { typeKind: TypeKind.TYPE_DATE },
          },
        ],
      },
    });
  });

  it('toTypeProto should not convert astStructTypeNode if type is wrong', () => {
    // arrange
    const astType = createAstStructTypeNode({
      structFields: [
        {
          name: { idString: 'structField' },
          type: createAstSimpleTypeNode({
            typeName: {
              names: [
                {
                  idString: 'dates',
                },
              ],
            },
          }),
        },
      ],
    });

    // act, assert
    toTypeProtoShouldConvertType(astType, undefined);
  });

  it('toTypeProto should not convert astStructTypeNode without name', () => {
    // arrange
    const astType = createAstStructTypeNode({
      structFields: [
        {
          name: {},
          type: createAstSimpleTypeNode({
            typeName: {
              names: [
                {
                  idString: 'date',
                },
              ],
            },
          }),
        },
      ],
    });

    // act, assert
    toTypeProtoShouldConvertType(astType, undefined);
  });

  it('toTypeProto should not convert astStructTypeNode if name is undefined', () => {
    // arrange
    const astType = createAstStructTypeNode({
      structFields: [
        {
          type: createAstSimpleTypeNode({
            typeName: {
              names: [
                {
                  idString: 'date',
                },
              ],
            },
          }),
        },
      ],
    });

    // act, assert
    toTypeProtoShouldConvertType(astType, undefined);
  });
});

function createAstSimpleTypeNode(astSimpleTypeNode?: ASTSimpleTypeProto): AnyASTTypeProto {
  return {
    node: 'astSimpleTypeNode',
    astSimpleTypeNode,
  };
}

function createAstArrayTypeNode(astArrayTypeNode?: ASTArrayTypeProto): AnyASTTypeProto {
  return {
    node: 'astArrayTypeNode',
    astArrayTypeNode,
  };
}

function createAstStructTypeNode(astStructTypeNode?: ASTStructTypeProto): AnyASTTypeProto {
  return {
    node: 'astStructTypeNode',
    astStructTypeNode,
  };
}

function toTypeProtoShouldConvertType(astType: AnyASTTypeProto, expectedType: TypeProto | undefined): void {
  // act
  const typeProto = toTypeProto(astType as AnyASTTypeProto__Output);

  // assert
  assertThat(typeProto, expectedType);
}

function createRange(start: number, end: number): ParseLocationRangeProto__Output {
  return { filename: '', start, end };
}
