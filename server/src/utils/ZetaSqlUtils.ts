import { TypeFactory, TypeKind } from '@fivetrandevelopers/zetasql';
import { AnyASTTypeProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/AnyASTTypeProto';
import { ParseLocationRangeProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRangeProto';
import { StructFieldProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/StructFieldProto';
import { TypeProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/TypeProto';
import { ColumnDefinition } from '../TableDefinition';

export function positionInRange(position: number, range: ParseLocationRangeProto__Output): boolean {
  return range.start <= position && position <= range.end;
}

export function rangeContainsRange(outerRange: ParseLocationRangeProto__Output, innerRange: ParseLocationRangeProto__Output): boolean {
  return outerRange.start <= innerRange.start && innerRange.end <= outerRange.end;
}

export function rangesEqual(range1: ParseLocationRangeProto__Output, range2: ParseLocationRangeProto__Output): boolean {
  return range1.start === range2.start && range1.end === range2.end;
}

// TODO: add unit tests
export function createType(newColumn: ColumnDefinition): TypeProto {
  const bigQueryType = newColumn.type.toLowerCase();
  const typeKind = TypeFactory.SIMPLE_TYPE_KIND_NAMES.get(bigQueryType);
  let resultType: TypeProto;
  if (typeKind) {
    resultType = {
      typeKind,
    };
  } else if (bigQueryType === 'record') {
    resultType = {
      typeKind: TypeKind.TYPE_STRUCT,
      structType: {
        field: newColumn.fields?.map<StructFieldProto>(f => ({
          fieldName: f.name,
          fieldType: createType(f),
        })),
      },
    };
  } else {
    console.log(`Cannot find TypeKind for ${newColumn.type}`); // TODO: fix all these issues
    resultType = {
      typeKind: TypeKind.TYPE_STRING,
    };
  }
  if (newColumn.mode?.toLocaleLowerCase() === 'repeated') {
    resultType = {
      typeKind: TypeKind.TYPE_ARRAY,
      arrayType: {
        elementType: resultType,
      },
    };
  }
  return resultType;
}

export function toTypeProto(astType: AnyASTTypeProto__Output): TypeProto | undefined {
  switch (astType.node) {
    case 'astSimpleTypeNode': {
      const simpleType = astType[astType.node];
      const names = simpleType?.typeName?.names;
      if (names?.length && names.length > 0) {
        const type = names[0].idString.toLowerCase();
        if (type) {
          const typeKind = TypeFactory.SIMPLE_TYPE_KIND_NAMES.get(type);
          if (typeKind) {
            return { typeKind };
          }
        }
      }
      break;
    }

    case 'astArrayTypeNode': {
      const arrayType = astType[astType.node];
      if (arrayType?.elementType) {
        const elementType = toTypeProto(arrayType.elementType);
        if (elementType) {
          return {
            typeKind: TypeKind.TYPE_ARRAY,
            arrayType: {
              elementType,
            },
          };
        }
      }
      break;
    }

    case 'astStructTypeNode': {
      const structType = astType[astType.node];
      if (structType?.structFields) {
        const field = structType.structFields.map<StructFieldProto>(f => ({
          fieldName: f.name?.idString,
          fieldType: f.type ? toTypeProto(f.type) : undefined,
        }));
        if (field.every(f => f.fieldName && f.fieldType)) {
          return {
            typeKind: TypeKind.TYPE_STRUCT,
            structType: {
              field,
            },
          };
        }
      }
      break;
    }

    default:
      break;
  }
  return undefined;
}
