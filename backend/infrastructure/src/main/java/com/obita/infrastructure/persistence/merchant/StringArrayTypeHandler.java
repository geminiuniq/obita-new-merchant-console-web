package com.obita.infrastructure.persistence.merchant;

import org.apache.ibatis.type.BaseTypeHandler;
import org.apache.ibatis.type.JdbcType;

import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/** MyBatis type handler for Postgres {@code TEXT[]}. */
public class StringArrayTypeHandler extends BaseTypeHandler<String[]> {

    @Override public void setNonNullParameter(PreparedStatement ps, int i, String[] parameter, JdbcType jdbcType)
        throws SQLException {
        ps.setArray(i, ps.getConnection().createArrayOf("text", parameter));
    }

    @Override public String[] getNullableResult(ResultSet rs, String columnName) throws SQLException {
        var arr = rs.getArray(columnName);
        return arr == null ? new String[0] : (String[]) arr.getArray();
    }

    @Override public String[] getNullableResult(ResultSet rs, int columnIndex) throws SQLException {
        var arr = rs.getArray(columnIndex);
        return arr == null ? new String[0] : (String[]) arr.getArray();
    }

    @Override public String[] getNullableResult(CallableStatement cs, int columnIndex) throws SQLException {
        var arr = cs.getArray(columnIndex);
        return arr == null ? new String[0] : (String[]) arr.getArray();
    }
}
